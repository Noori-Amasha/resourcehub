import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { loginSchema } from "./validation";
import { authService, AuthError } from "./service";

import {
  getSession,
  setSessionCookie,
  clearSessionCookie,
} from "@/server/auth/jwt";

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function handleError(error: unknown) {
  if (error instanceof AuthError) {
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

  console.error("Authentication error:", error);
  return failure("Internal server error.", 500);
}

function validOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export const authController = {
  async login(request: NextRequest) {
    try {
      if (!validOrigin(request)) {
        return failure("Invalid request origin.", 403);
      }

      let input: unknown;

      try {
        input = await request.json();
      } catch {
        return failure("Invalid JSON body.", 400);
      }

      const { email, password } = loginSchema.parse(input);

      const result = await authService.login(email, password);

      const response = NextResponse.json({
        success: true,
        message: "Login successful.",
        user: result.user,
        redirectTo: result.redirectTo,
      });

      return setSessionCookie(response, result.token);
    } catch (error) {
      return handleError(error);
    }
  },

  async logout(request: NextRequest) {
    if (!validOrigin(request)) {
      return failure("Invalid request origin.", 403);
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });

    return clearSessionCookie(response);
  },

  async me() {
    try {
      const session = await getSession();

      if (!session) {
        return failure("Not authenticated.", 401);
      }

      const user = await authService.getCurrentUser(session.userId);

      if (!user || user.role !== session.role) {
        return clearSessionCookie(failure("Invalid or expired session.", 401));
      }

      return NextResponse.json({
        success: true,
        user,
      });
    } catch (error) {
      return handleError(error);
    }
  },
};
