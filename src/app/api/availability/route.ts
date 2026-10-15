import { NextRequest, NextResponse, connection } from "next/server";

import { z, ZodError } from "zod";

import { requireAuth } from "@/server/auth/permissions";
import { AuthError } from "@/server/modules/auth/service";
import { BookingError } from "@/server/config/bookingRules";
import { checkAvailability } from "@/server/modules/availability/service";

const querySchema = z.object({
  resourceTypeId: z.string().uuid(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

export async function GET(request: NextRequest) {
  await connection();

  try {
    await requireAuth();

    const params = request.nextUrl.searchParams;

    const input = querySchema.parse({
      resourceTypeId: params.get("resourceTypeId"),
      startTime: params.get("startTime"),
      endTime: params.get("endTime"),
    });

    const result = await checkAvailability(input);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
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
          message: "Invalid availability parameters.",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    console.error("Availability API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error.",
      },
      { status: 500 },
    );
  }
}
