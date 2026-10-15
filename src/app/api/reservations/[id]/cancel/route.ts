import { NextRequest } from "next/server";
import { z } from "zod";
import { CancellationReason, UserRole } from "@prisma/client";

import { requireAuth } from "@/server/auth/permissions";
import { reservationLifecycle } from "@/server/modules/reservations/lifecycle";
import {
  apiError,
  apiSuccess,
  assertSameOrigin,
  readJson,
} from "@/server/modules/reservations/api-helper";

type Context = {
  params: Promise<{ id: string }>;
};

const schema = z
  .object({
    reason: z.nativeEnum(CancellationReason).optional(),
  })
  .strict();

export async function POST(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);

    const actor = await requireAuth();
    const { id } = await context.params;

    z.string().uuid().parse(id);

    const body = schema.parse(await readJson(request));

    if (
      actor.role === UserRole.EMPLOYEE &&
      body.reason &&
      body.reason !== CancellationReason.USER_REQUEST
    ) {
      return apiError(
        new ErrorWithStatus(
          "Employees cannot choose an admin cancellation reason.",
        ),
      );
    }

    return apiSuccess(
      await reservationLifecycle.cancel(id, actor, body.reason),
    );
  } catch (error) {
    return apiError(error);
  }
}

import { BookingError } from "@/server/config/bookingRules";

class ErrorWithStatus extends BookingError {
  constructor(message: string) {
    super(message, 403);
  }
}
