import { NextRequest } from "next/server";
import { resourceController } from "@/server/modules/resources/controller";


export async function GET() {
  return resourceController.listTypes();
}

export async function POST(request: NextRequest) {
  return resourceController.createType(request);
}
