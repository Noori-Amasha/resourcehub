import "server-only";

import {
  Prisma,
  ReservationEventType,
  ReservationStatus,
  ResourceUnitStatus,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { BookingError } from "@/server/config/bookingRules";

type CreateData = {
  employeeId: string;
  resourceUnitId: string;
  startTime: Date;
  endTime: Date;
  purpose?: string;
};

export const reservationRepository = {
  async create(data: CreateData) {
    return prisma.$transaction(
      async (tx) => {
        // Lock the physical unit during this transaction.
        // This serializes booking attempts for this unit.
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id"
          FROM "ResourceUnit"
          WHERE "id" = ${data.resourceUnitId}::uuid
          FOR UPDATE
        `;

        if (locked.length === 0) {
          throw new BookingError("Physical resource unit not found.", 404);
        }

        const unit = await tx.resourceUnit.findUnique({
          where: { id: data.resourceUnitId },
        });

        if (!unit || unit.status !== ResourceUnitStatus.ACTIVE) {
          throw new BookingError("Resource unit is not active.", 409);
        }

        // Check overlapping intervals or outstanding checkouts.
        const conflict = await tx.reservation.findFirst({
          where: {
            resourceUnitId: data.resourceUnitId,
            OR: [
              {
                status: {
                  in: [
                    ReservationStatus.CONFIRMED,
                    ReservationStatus.CHECKED_OUT,
                    ReservationStatus.COMPLETED,
                  ],
                },
                startTime: { lt: data.endTime },
                endTime: { gt: data.startTime },
              },
              {
                status: ReservationStatus.CHECKED_OUT,
              },
            ],
          },
          select: { id: true },
        });

        if (conflict) {
          throw new BookingError(
            "This unit is already booked or checked out.",
            409,
          );
        }

        const reservation = await tx.reservation.create({
          data: {
            employeeId: data.employeeId,
            resourceUnitId: data.resourceUnitId,
            startTime: data.startTime,
            endTime: data.endTime,
            purpose: data.purpose,
            status: ReservationStatus.CONFIRMED,
          },
        });

        await tx.reservationEvent.create({
          data: {
            reservationId: reservation.id,
            resourceUnitId: reservation.resourceUnitId,
            actorId: data.employeeId,
            eventType: ReservationEventType.CREATED,
            details: {
              startTime: data.startTime.toISOString(),
              endTime: data.endTime.toISOString(),
              purpose: data.purpose ?? null,
            },
          },
        });

        return reservation;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      },
    );
  },

  listForEmployee(employeeId: string) {
    return prisma.reservation.findMany({
      where: { employeeId },
      include: {
        resourceUnit: {
          include: {
            resourceType: {
              include: { category: true },
            },
          },
        },
      },
      orderBy: { startTime: "desc" },
    });
  },

  listAll() {
    return prisma.reservation.findMany({
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        resourceUnit: {
          include: {
            resourceType: {
              include: { category: true },
            },
          },
        },
      },
      orderBy: { startTime: "desc" },
    });
  },
};
