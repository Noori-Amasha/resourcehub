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
    assertSameOrigin(request);

    const actor = await requireAdmin();
    const { id } = await context.params;

    z.string().uuid().parse(id);

    return apiSuccess(await reservationLifecycle.returnUnit(id, actor));
  } catch (error) {
    return apiError(error);
  }
}
