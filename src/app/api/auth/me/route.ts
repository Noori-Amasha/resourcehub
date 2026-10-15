import { connection } from "next/server";
import { authController } from "@/server/modules/auth/controller";

export async function GET() {
  await connection();

  return authController.me();
}
