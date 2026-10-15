import { connection } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/server/auth/permissions";
import { reservationLifecycle } from "@/server/modules/reservations/lifecycle";
import { apiError, apiSuccess } from "@/server/modules/reservations/api-helper";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  await connection();

  try {
    const actor = await requireAuth();
    const { id } = await context.params;

    z.string().uuid().parse(id);

    return apiSuccess(await reservationLifecycle.getEvents(id, actor));
  } catch (error) {
    return apiError(error);
  }
}
