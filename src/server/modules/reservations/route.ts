import { NextRequest, connection } from "next/server";

import { reservationController } from "@/server/modules/reservations/controller";

export async function GET(request: NextRequest) {
  await connection();

  return reservationController.list(request);
}

export async function POST(request: NextRequest) {
  return reservationController.create(request);
}
