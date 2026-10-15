import { NextRequest } from "next/server";
import { resourceController } from "@/server/modules/resources/controller";


export async function GET() {
  return resourceController.listCategories();
}

export async function POST(request: NextRequest) {
  return resourceController.createCategory(request);
}
