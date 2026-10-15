import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/permissions";
import { maintenanceService } from "@/server/modules/maintenance/service";

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
    strategy: z.enum(["REASSIGN", "CANCEL"]),
  })
  .strict();

export async function POST(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);

    const admin = await requireAdmin();
    const { id } = await context.params;

    z.string().uuid().parse(id);

    const body = schema.parse(await readJson(request));

    return apiSuccess(
      await maintenanceService.start(id, admin.id, body.strategy),
    );
  } catch (error) {
    return apiError(error);
  }
}
