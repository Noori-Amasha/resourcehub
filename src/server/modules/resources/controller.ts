import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { requireAuth, requireAdmin } from "@/server/auth/permissions";
import { AuthError } from "@/server/modules/auth/service";

import { resourceService } from "./service";
import { ResourceError } from "./service";

import {
  categoryCreateSchema,
  categoryUpdateSchema,
  typeCreateSchema,
  typeUpdateSchema,
  unitCreateSchema,
  unitUpdateSchema,
  uuidSchema,
} from "./validation";

function success(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function handleError(error: unknown) {
  if (error instanceof AuthError || error instanceof ResourceError) {
    return failure(error.message, error.statusCode);
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
    if (error.code === "P2002") {
      return failure("A record with these unique values already exists.", 409);
    }

    if (error.code === "P2003") {
      return failure("The referenced record does not exist or is in use.", 409);
    }

    if (error.code === "P2025") {
      return failure("Record not found.", 404);
    }
  }

  console.error("Resource API error:", error);
  return failure("Internal server error.", 500);
}

async function readBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ResourceError("Invalid JSON request body.", 400);
  }
}

function validateId(id: string): string {
  return uuidSchema.parse(id);
}

function checkOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && origin !== request.nextUrl.origin) {
    throw new ResourceError("Invalid request origin.", 403);
  }
}

export const resourceController = {
  async listCategories() {
    try {
      await requireAuth();
      return success(await resourceService.listCategories());
    } catch (error) {
      return handleError(error);
    }
  },

  async createCategory(request: NextRequest) {
    try {
      checkOrigin(request);
      await requireAdmin();
      const body = categoryCreateSchema.parse(await readBody(request));
      return success(await resourceService.createCategory(body), 201);
    } catch (error) {
      return handleError(error);
    }
  },

  async updateCategory(request: NextRequest, id: string) {
    try {
      checkOrigin(request);
      await requireAdmin();
      const body = categoryUpdateSchema.parse(await readBody(request));
      return success(
        await resourceService.updateCategory(validateId(id), body),
      );
    } catch (error) {
      return handleError(error);
    }
  },

  async listTypes() {
    try {
      await requireAuth();
      return success(await resourceService.listTypes());
    } catch (error) {
      return handleError(error);
    }
  },

  async createType(request: NextRequest) {
    try {
      checkOrigin(request);
      await requireAdmin();
      const body = typeCreateSchema.parse(await readBody(request));
      return success(await resourceService.createType(body), 201);
    } catch (error) {
      return handleError(error);
    }
  },

  async updateType(request: NextRequest, id: string) {
    try {
      checkOrigin(request);
      await requireAdmin();
      const body = typeUpdateSchema.parse(await readBody(request));
      return success(await resourceService.updateType(validateId(id), body));
    } catch (error) {
      return handleError(error);
    }
  },

  async listUnits() {
    try {
      await requireAuth();
      return success(await resourceService.listUnits());
    } catch (error) {
      return handleError(error);
    }
  },

  async createUnit(request: NextRequest) {
    try {
      checkOrigin(request);
      await requireAdmin();
      const body = unitCreateSchema.parse(await readBody(request));
      return success(await resourceService.createUnit(body), 201);
    } catch (error) {
      return handleError(error);
    }
  },

  async updateUnit(request: NextRequest, id: string) {
    try {
      checkOrigin(request);
      await requireAdmin();
      const body = unitUpdateSchema.parse(await readBody(request));
      return success(await resourceService.updateUnit(validateId(id), body));
    } catch (error) {
      return handleError(error);
    }
  },
};
