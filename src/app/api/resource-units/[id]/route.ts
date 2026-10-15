import { NextRequest } from "next/server";
import { resourceController } from "@/server/modules/resources/controller";


type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  return resourceController.updateUnit(request, id);
}
