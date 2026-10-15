import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdmin } from "@/server/auth/permissions";
import { AuthError } from "@/server/modules/auth/service";
import { ResourceError } from "@/server/modules/resources/service";

import { bulkCreateUnitsSchema } from "@/server/modules/resources/bulk-validation";
import { bulkCreateUnits } from "@/server/modules/resources/bulk-service";

export async function POST(request: NextRequest) {
  try {
    // Check request origin
    const origin = request.headers.get("origin");

    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request origin.",
        },
        { status: 403 },
      );
    }

    // Only ADMIN users can create resource units
    await requireAdmin();

    // Read JSON request body
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body.",
        },
        { status: 400 },
      );
    }

    // Validate quantity, resource type and unit codes
    const validatedData = bulkCreateUnitsSchema.parse(body);

    // Create physical resource units in PostgreSQL
    const result = await bulkCreateUnits(validatedData);

    return NextResponse.json(
      {
        success: true,
        message: "Resource units created successfully.",
        data: result,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    // Authentication and business-rule errors
    if (error instanceof AuthError || error instanceof ResourceError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.statusCode },
      );
    }

    // Input validation errors
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

    // Unexpected errors
    console.error("Bulk resource creation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error.",
      },
      { status: 500 },
    );
  }
}
