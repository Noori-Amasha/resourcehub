import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/permissions";

import { reservationLifecycle } from "@/server/modules/reservations/lifecycle";

import {
  apiError,
  apiSuccess,
  assertSameOrigin,
} from "@/server/modules/reservations/api-helper";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  try {
    // Validate request origin
    assertSameOrigin(request);

    // Only ADMIN can check out resources
    const admin = await requireAdmin();

    // Get reservation ID from the URL
    const { id } = await context.params;

    // Validate reservation UUID
    z.string().uuid().parse(id);

    // Perform checkout
    const result = await reservationLifecycle.checkout(id, admin);

    return apiSuccess(result);
  } catch (error: unknown) {
    return apiError(error);
  }
}
