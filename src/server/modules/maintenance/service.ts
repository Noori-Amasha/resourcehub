import "server-only";

import {
  CancellationReason,
  Prisma,
  ReservationEventType,
  ReservationStatus,
  ResourceUnitStatus,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { BookingError } from "@/server/config/bookingRules";

type MaintenanceStrategy = "REASSIGN" | "CANCEL";

async function lockUnit(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "ResourceUnit"
    WHERE "id" = ${id}::uuid
    FOR UPDATE
  `;

  if (!rows.length) {
    throw new BookingError("Resource unit not found.", 404);
  }
}

async function findReplacement(
  tx: Prisma.TransactionClient,
  sourceUnitId: string,
  resourceTypeId: string,
  startTime: Date,
  endTime: Date,
) {
  // Lock a replacement candidate without waiting on units
  // being modified by another concurrent transaction.
  const candidates = await tx.$queryRaw<{ id: string }[]>`
    SELECT u."id"
    FROM "ResourceUnit" AS u
    WHERE u."resourceTypeId" = ${resourceTypeId}::uuid
      AND u."status" = 'ACTIVE'::"ResourceUnitStatus"
      AND u."id" <> ${sourceUnitId}::uuid
      AND NOT EXISTS (
        SELECT 1
        FROM "Reservation" AS r
        WHERE r."resourceUnitId" = u."id"
          AND (
            (
              r."status" IN (
                'CONFIRMED'::"ReservationStatus",
                'CHECKED_OUT'::"ReservationStatus",
                'COMPLETED'::"ReservationStatus"
              )
              AND r."startTime" < ${endTime}
              AND r."endTime" > ${startTime}
            )
            OR r."status" = 'CHECKED_OUT'::"ReservationStatus"
          )
      )
    ORDER BY u."unitCode"
    FOR UPDATE OF u SKIP LOCKED
  `;

  return candidates[0]?.id ?? null;
}

export const maintenanceService = {
  async start(unitId: string, actorId: string, strategy: MaintenanceStrategy) {
    return prisma.$transaction(
      async (tx) => {
        await lockUnit(tx, unitId);

        const unit = await tx.resourceUnit.findUnique({
          where: { id: unitId },
        });

        if (!unit) {
          throw new BookingError("Resource unit not found.", 404);
        }

        if (unit.status !== ResourceUnitStatus.ACTIVE) {
          throw new BookingError(
            "Only active resource units can enter maintenance.",
            409,
          );
        }

        const checkedOut = await tx.reservation.count({
          where: {
            resourceUnitId: unitId,
            status: ReservationStatus.CHECKED_OUT,
          },
        });

        if (checkedOut > 0) {
          throw new BookingError(
            "The unit must be returned before maintenance begins.",
            409,
          );
        }

        const now = new Date();

        const affected = await tx.reservation.findMany({
          where: {
            resourceUnitId: unitId,
            status: ReservationStatus.CONFIRMED,
            endTime: { gt: now },
          },
          orderBy: { startTime: "asc" },
        });

        let reassigned = 0;
        let cancelled = 0;

        for (const reservation of affected) {
          if (strategy === "REASSIGN") {
            const replacementId = await findReplacement(
              tx,
              unitId,
              unit.resourceTypeId,
              reservation.startTime,
              reservation.endTime,
            );

            if (!replacementId) {
              throw new BookingError(
                "No replacement available for all affected reservations. Choose cancellation instead.",
                409,
              );
            }

            await tx.reservation.update({
              where: { id: reservation.id },
              data: { resourceUnitId: replacementId },
            });

            await tx.reservationEvent.create({
              data: {
                reservationId: reservation.id,
                resourceUnitId: replacementId,
                actorId,
                eventType: ReservationEventType.REASSIGNED,
                details: {
                  oldUnitId: unitId,
                  newUnitId: replacementId,
                  reason: "RESOURCE_MAINTENANCE",
                },
              },
            });

            reassigned++;
          } else {
            await tx.reservation.update({
              where: { id: reservation.id },
              data: {
                status: ReservationStatus.CANCELLED,
                cancelledAt: now,
                cancelledById: actorId,
                cancellationReason: CancellationReason.RESOURCE_MAINTENANCE,
              },
            });

            await tx.reservationEvent.create({
              data: {
                reservationId: reservation.id,
                resourceUnitId: unitId,
                actorId,
                eventType: ReservationEventType.CANCELLED,
                details: {
                  reason: "RESOURCE_MAINTENANCE",
                },
              },
            });

            cancelled++;
          }
        }

        await tx.resourceUnit.update({
          where: { id: unitId },
          data: { status: ResourceUnitStatus.MAINTENANCE },
        });

        await tx.reservationEvent.create({
          data: {
            resourceUnitId: unitId,
            actorId,
            eventType: ReservationEventType.MAINTENANCE_STARTED,
            details: {
              strategy,
              reassigned,
              cancelled,
            },
          },
        });

        return {
          unitId,
          status: ResourceUnitStatus.MAINTENANCE,
          reassigned,
          cancelled,
        };
      },
      { timeout: 30000 },
    );
  },

  async end(unitId: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      await lockUnit(tx, unitId);

      const unit = await tx.resourceUnit.findUnique({
        where: { id: unitId },
      });

      if (!unit) {
        throw new BookingError("Resource unit not found.", 404);
      }

      if (unit.status !== ResourceUnitStatus.MAINTENANCE) {
        throw new BookingError("This unit is not under maintenance.", 409);
      }

      const updated = await tx.resourceUnit.update({
        where: { id: unitId },
        data: { status: ResourceUnitStatus.ACTIVE },
      });

      await tx.reservationEvent.create({
        data: {
          resourceUnitId: unitId,
          actorId,
          eventType: ReservationEventType.MAINTENANCE_ENDED,
        },
      });

      return updated;
    });
  },
};
