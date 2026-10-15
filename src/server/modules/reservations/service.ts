import "server-only";

import { Prisma, UserRole, ReservationStatus } from "@prisma/client";

import {
  BookingError,
  validateBookingInterval,
} from "@/server/config/bookingRules";

import { reservationRepository } from "./repository";
import type { CreateReservationInput } from "./validation";

function isConstraintError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  const details = JSON.stringify(error.meta ?? {});

  return (
    error.code === "P2002" ||
    ((error.code === "P2004" || error.code === "P2010") &&
      (details.includes("23P01") ||
        details.includes("reservation_prevent_double_booking")))
  );
}

export const reservationService = {
  async create(employeeId: string, input: CreateReservationInput) {
    const interval = validateBookingInterval(input.startTime, input.endTime);

    try {
      return await reservationRepository.create({
        employeeId,
        resourceUnitId: input.resourceUnitId,
        startTime: interval.startTime,
        endTime: interval.endTime,
        purpose: input.purpose,
      });
    } catch (error) {
      if (error instanceof BookingError) {
        throw error;
      }

      if (isConstraintError(error)) {
        throw new BookingError(
          "Reservation conflict. Choose another time or physical unit.",
          409,
        );
      }

      throw error;
    }
  },

  async list(user: { id: string; role: UserRole }) {
    const reservations =
      user.role === UserRole.ADMIN
        ? await reservationRepository.listAll()
        : await reservationRepository.listForEmployee(user.id);

    const now = new Date();

    return reservations.map((reservation) => ({
      ...reservation,
      isOverdue:
        reservation.status === ReservationStatus.CHECKED_OUT &&
        reservation.endTime < now,
    }));
  },
};
