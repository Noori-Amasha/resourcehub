import "server-only";

import { ReservationStatus, ResourceUnitStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export const availabilityRepository = {
  getResourceType(id: string) {
    return prisma.resourceType.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  getTotalUnits(resourceTypeId: string) {
    return prisma.resourceUnit.count({
      where: { resourceTypeId },
    });
  },

  getAvailableUnits(resourceTypeId: string, startTime: Date, endTime: Date) {
    return prisma.resourceUnit.findMany({
      where: {
        resourceTypeId,
        status: ResourceUnitStatus.ACTIVE,

        reservations: {
          none: {
            OR: [
              {
                status: {
                  in: [
                    ReservationStatus.CONFIRMED,
                    ReservationStatus.CHECKED_OUT,
                    ReservationStatus.COMPLETED,
                  ],
                },
                startTime: { lt: endTime },
                endTime: { gt: startTime },
              },
              {
                status: ReservationStatus.CHECKED_OUT,
              },
            ],
          },
        },
      },
      select: {
        id: true,
        unitCode: true,
        name: true,
        status: true,
      },
      orderBy: { unitCode: "asc" },
    });
  },
};
