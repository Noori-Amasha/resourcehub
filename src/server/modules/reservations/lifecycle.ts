import "server-only";

import {
  CancellationReason,
  Prisma,
  ReservationEventType,
  ReservationStatus,
  ResourceUnitStatus,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { BookingError } from "@/server/config/bookingRules";

type Actor = {
  id: string;
  role: UserRole;
};

async function lockUnit(tx: Prisma.TransactionClient, unitId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "ResourceUnit"
    WHERE "id" = ${unitId}::uuid
    FOR UPDATE
  `;

  if (!rows.length) {
    throw new BookingError("Resource unit not found.", 404);
  }
}

async function getReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    select: { id: true, resourceUnitId: true },
  });

  if (!reservation) {
    throw new BookingError("Reservation not found.", 404);
  }

  return reservation;
}

export const reservationLifecycle = {
  async cancel(id: string, actor: Actor, requestedReason?: CancellationReason) {
    const reference = await getReservation(id);

    return prisma.$transaction(async (tx) => {
      await lockUnit(tx, reference.resourceUnitId);

      const reservation = await tx.reservation.findUnique({
        where: { id },
      });

      if (!reservation) {
        throw new BookingError("Reservation not found.", 404);
      }

      if (
        actor.role !== UserRole.ADMIN &&
        reservation.employeeId !== actor.id
      ) {
        throw new BookingError("Access denied.", 403);
      }

      if (reservation.status !== ReservationStatus.CONFIRMED) {
        throw new BookingError(
          "Only confirmed reservations can be cancelled.",
          409,
        );
      }

      const reason =
        actor.role === UserRole.EMPLOYEE
          ? CancellationReason.USER_REQUEST
          : (requestedReason ?? CancellationReason.ADMIN_REQUEST);

      const now = new Date();

      const updated = await tx.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CANCELLED,
          cancelledAt: now,
          cancelledById: actor.id,
          cancellationReason: reason,
        },
      });

      await tx.reservationEvent.create({
        data: {
          reservationId: id,
          resourceUnitId: reservation.resourceUnitId,
          actorId: actor.id,
          eventType: ReservationEventType.CANCELLED,
          details: { reason },
        },
      });

      return updated;
    });
  },

  async checkout(id: string, actor: Actor) {
    if (actor.role !== UserRole.ADMIN) {
      throw new BookingError("Admin access required.", 403);
    }

    const reference = await getReservation(id);

    return prisma.$transaction(async (tx) => {
      await lockUnit(tx, reference.resourceUnitId);

      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: { resourceUnit: true },
      });

      if (!reservation) {
        throw new BookingError("Reservation not found.", 404);
      }

      if (reservation.status !== ReservationStatus.CONFIRMED) {
        throw new BookingError(
          "Only confirmed reservations can be checked out.",
          409,
        );
      }

      if (reservation.resourceUnit.status !== ResourceUnitStatus.ACTIVE) {
        throw new BookingError("Resource unit is not active.", 409);
      }

      const now = new Date();

      if (now < reservation.startTime) {
        throw new BookingError(
          "Cannot check out before the scheduled start.",
          409,
        );
      }

      if (now >= reservation.endTime) {
        throw new BookingError("Scheduled reservation has already ended.", 409);
      }

      const activeCheckout = await tx.reservation.findFirst({
        where: {
          resourceUnitId: reservation.resourceUnitId,
          status: ReservationStatus.CHECKED_OUT,
          id: { not: id },
        },
      });

      if (activeCheckout) {
        throw new BookingError(
          "This resource is still checked out by another employee.",
          409,
        );
      }

      const updated = await tx.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CHECKED_OUT,
          checkedOutAt: now,
        },
      });

      await tx.reservationEvent.create({
        data: {
          reservationId: id,
          resourceUnitId: reservation.resourceUnitId,
          actorId: actor.id,
          eventType: ReservationEventType.CHECKED_OUT,
        },
      });

      return updated;
    });
  },

  async returnUnit(id: string, actor: Actor) {
    if (actor.role !== UserRole.ADMIN) {
      throw new BookingError("Admin access required.", 403);
    }

    const reference = await getReservation(id);

    return prisma.$transaction(async (tx) => {
      await lockUnit(tx, reference.resourceUnitId);

      const reservation = await tx.reservation.findUnique({
        where: { id },
      });

      if (!reservation) {
        throw new BookingError("Reservation not found.", 404);
      }

      if (reservation.status !== ReservationStatus.CHECKED_OUT) {
        throw new BookingError(
          "Only checked-out reservations can be returned.",
          409,
        );
      }

      const now = new Date();

      const updated = await tx.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.COMPLETED,
          returnedAt: now,
        },
      });

      await tx.reservationEvent.create({
        data: {
          reservationId: id,
          resourceUnitId: reservation.resourceUnitId,
          actorId: actor.id,
          eventType: ReservationEventType.RETURNED,
          details: {
            wasLate: now > reservation.endTime,
          },
        },
      });

      return updated;
    });
  },

  async markNoShow(id: string, actor: Actor) {
    if (actor.role !== UserRole.ADMIN) {
      throw new BookingError("Admin access required.", 403);
    }

    const reference = await getReservation(id);

    return prisma.$transaction(async (tx) => {
      await lockUnit(tx, reference.resourceUnitId);

      const reservation = await tx.reservation.findUnique({
        where: { id },
      });

      if (!reservation) {
        throw new BookingError("Reservation not found.", 404);
      }

      if (reservation.status !== ReservationStatus.CONFIRMED) {
        throw new BookingError(
          "Only confirmed reservations can be marked no-show.",
          409,
        );
      }

      const now = new Date();

      if (now < reservation.startTime) {
        throw new BookingError(
          "Cannot mark no-show before the reservation start.",
          409,
        );
      }

      const updated = await tx.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.NO_SHOW,
          noShowAt: now,
        },
      });

      await tx.reservationEvent.create({
        data: {
          reservationId: id,
          resourceUnitId: reservation.resourceUnitId,
          actorId: actor.id,
          eventType: ReservationEventType.MARKED_NO_SHOW,
        },
      });

      return updated;
    });
  },

  async getEvents(id: string, actor: Actor) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: { employeeId: true },
    });

    if (!reservation) {
      throw new BookingError("Reservation not found.", 404);
    }

    if (actor.role !== UserRole.ADMIN && reservation.employeeId !== actor.id) {
      throw new BookingError("Access denied.", 403);
    }

    return prisma.reservationEvent.findMany({
      where: { reservationId: id },
      include: {
        actor: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },
};
