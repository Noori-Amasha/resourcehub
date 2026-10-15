import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { AuthError } from "@/server/modules/auth/service";
import { BookingError } from "@/server/config/bookingRules";

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && origin !== request.nextUrl.origin) {
    throw new BookingError("Invalid request origin.", 403);
  }
}

export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new BookingError("Invalid JSON body.", 400);
  }
}

export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(error: unknown) {
  if (error instanceof AuthError || error instanceof BookingError) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation failed.",
        errors: error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const details = JSON.stringify(error.meta ?? {});

    if (
      error.code === "P2002" ||
      details.includes("23P01") ||
      details.includes("reservation_prevent_double_booking")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Reservation conflict.",
        },
        { status: 409 },
      );
    }

    if (error.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          message: "Record not found.",
        },
        { status: 404 },
      );
    }

    if (error.code === "P2034") {
      return NextResponse.json(
        {
          success: false,
          message: "Concurrent update conflict. Please retry.",
        },
        { status: 409 },
      );
    }
  }

  console.error("Backend operation failed:", error);

  return NextResponse.json(
    {
      success: false,
      message: "Internal server error.",
    },
    { status: 500 },
  );
}
