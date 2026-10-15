import "server-only";

export const BOOKING_RULES = {
  timeZone: "Asia/Colombo",
  openingHour: 8,
  closingHour: 17,
  slotMinutes: 30,
  bookingWindowHours: 48,
} as const;

export class BookingError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BOOKING_RULES.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getColomboParts(date: Date) {
  const parts = formatter.formatToParts(date);

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    second: Number(value("second")),
  };
}

export function validateBookingInterval(startInput: string, endInput: string) {
  const isoPattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

  if (!isoPattern.test(startInput) || !isoPattern.test(endInput)) {
    throw new BookingError(
      "Use ISO timestamps with an offset, for example 2026-10-16T09:00:00+05:30.",
    );
  }

  const startTime = new Date(startInput);
  const endTime = new Date(endInput);

  if (
    !Number.isFinite(startTime.getTime()) ||
    !Number.isFinite(endTime.getTime())
  ) {
    throw new BookingError("Invalid reservation date or time.");
  }

  const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;

  if (durationMinutes < BOOKING_RULES.slotMinutes) {
    throw new BookingError("A reservation must last at least 30 minutes.");
  }

  const start = getColomboParts(startTime);
  const end = getColomboParts(endTime);

  if (start.date !== end.date) {
    throw new BookingError("Overnight reservations are not permitted.");
  }

  if (
    start.minute % 30 !== 0 ||
    end.minute % 30 !== 0 ||
    start.second !== 0 ||
    end.second !== 0 ||
    startTime.getUTCMilliseconds() !== 0 ||
    endTime.getUTCMilliseconds() !== 0
  ) {
    throw new BookingError("Start and end must align to 30-minute boundaries.");
  }

  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  if (
    startMinutes < BOOKING_RULES.openingHour * 60 ||
    endMinutes > BOOKING_RULES.closingHour * 60
  ) {
    throw new BookingError(
      "Reservations must be between 8:00 AM and 5:00 PM Sri Lanka time.",
    );
  }

  const now = Date.now();
  const latest = now + BOOKING_RULES.bookingWindowHours * 60 * 60 * 1000;

  if (startTime.getTime() <= now) {
    throw new BookingError("Reservation start time must be in the future.");
  }

  if (endTime.getTime() > latest) {
    throw new BookingError(
      "The reservation must finish within the next 48 hours.",
    );
  }

  return { startTime, endTime };
}
