import { NextRequest } from "next/server";
import { authController } from "@/server/modules/auth/controller";


export async function POST(request: NextRequest) {
  return authController.logout(request);
}
