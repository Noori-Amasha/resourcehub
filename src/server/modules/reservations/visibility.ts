import "server-only";

import { ReservationStatus } from "@prisma/client";

type VisibleReservation = {
  status: ReservationStatus;
  cancelledAt: Date | null;
  noShowAt: Date | null;
};

const COLOMBO_OFFSET_MS = 330 * 60 * 1000;

function colomboDay(date: Date): number {
  return Math.floor(
    (date.getTime() + COLOMBO_OFFSET_MS) / (24 * 60 * 60 * 1000),
  );
}

export function isVisibleInNormalList(
  reservation: VisibleReservation,
  now = new Date(),
): boolean {
  if (reservation.status === ReservationStatus.CANCELLED) {
    return reservation.cancelledAt
      ? colomboDay(reservation.cancelledAt) === colomboDay(now)
      : false;
  }

  if (reservation.status === ReservationStatus.NO_SHOW) {
    return reservation.noShowAt
      ? colomboDay(reservation.noShowAt) === colomboDay(now)
      : false;
  }

  return true;
}
