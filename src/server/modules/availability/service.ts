import "server-only";

import {
  BookingError,
  validateBookingInterval,
} from "@/server/config/bookingRules";

import { availabilityRepository } from "./repository";

export async function checkAvailability(input: {
  resourceTypeId: string;
  startTime: string;
  endTime: string;
}) {
  const { startTime, endTime } = validateBookingInterval(
    input.startTime,
    input.endTime,
  );

  const resourceType = await availabilityRepository.getResourceType(
    input.resourceTypeId,
  );

  if (!resourceType) {
    throw new BookingError("Resource type not found.", 404);
  }

  const [totalUnits, availableUnits] = await Promise.all([
    availabilityRepository.getTotalUnits(input.resourceTypeId),
    availabilityRepository.getAvailableUnits(
      input.resourceTypeId,
      startTime,
      endTime,
    ),
  ]);

  return {
    resourceType,
    startTime,
    endTime,
    totalUnits,
    availableCount: availableUnits.length,
    availableUnits,
  };
}
