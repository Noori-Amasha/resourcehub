import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAuth, requireEmployee } from "@/server/auth/permissions";

import { AuthError } from "@/server/modules/auth/service";
import { BookingError } from "@/server/config/bookingRules";

import { createReservationSchema } from "./validation";
import { reservationService } from "./service";

function handleError(error: unknown) {
  if (error instanceof AuthError || error instanceof BookingError) {
    return NextResponse.json(
      { success: false, message: error.message },
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

  console.error("Reservation API error:", error);

  return NextResponse.json(
    {
      success: false,
      message: "Internal server error.",
    },
    { status: 500 },
  );
}

export const reservationController = {
  async create(request: NextRequest) {
    try {
      const origin = request.headers.get("origin");

      if (origin && origin !== request.nextUrl.origin) {
        return NextResponse.json(
          { success: false, message: "Invalid request origin." },
          { status: 403 },
        );
      }

      const employee = await requireEmployee();

      let body: unknown;

      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, message: "Invalid JSON." },
          { status: 400 },
        );
      }

      const input = createReservationSchema.parse(body);

      const reservation = await reservationService.create(employee.id, input);

      return NextResponse.json(
        {
          success: true,
          message: "Reservation confirmed successfully.",
          data: reservation,
        },
        { status: 201 },
      );
    } catch (error) {
      return handleError(error);
    }
  },

  async list(request: NextRequest) {
    try {
      const user = await requireAuth();

      const includeHistory =
        request.nextUrl.searchParams.get("history") === "true";

      const reservations = await reservationService.list(user, includeHistory);

      return NextResponse.json({
        success: true,
        data: reservations,
      });
    } catch (error) {
      return handleError(error);
    }
  },
};
