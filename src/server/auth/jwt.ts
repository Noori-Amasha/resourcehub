import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "resourcehub_session";

const SESSION_DURATION = 60 * 60 * 8;

export type SessionPayload = {
  userId: string;
  role: UserRole;
};

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters.");
  }

  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  session: SessionPayload,
): Promise<string> {
  return new SignJWT({ role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setIssuer("resourcehub")
    .setAudience("resourcehub-users")
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      issuer: "resourcehub",
      audience: "resourcehub-users",
    });

    if (
      typeof payload.sub !== "string" ||
      (payload.role !== UserRole.ADMIN && payload.role !== UserRole.EMPLOYEE)
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  return verifySessionToken(token);
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });

  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
