import "server-only";

import { UserRole } from "@prisma/client";
import { getSession } from "./jwt";

import {
  authService,
  AuthError,
  type PublicUser,
} from "@/server/modules/auth/service";

export async function requireAuth(): Promise<PublicUser> {
  const session = await getSession();

  if (!session) {
    throw new AuthError("Authentication required.", 401);
  }

  const user = await authService.getCurrentUser(session.userId);

  if (!user || user.role !== session.role) {
    throw new AuthError("Session is invalid or expired.", 401);
  }

  return user;
}

export async function requireRole(
  allowedRoles: UserRole[],
): Promise<PublicUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError("You do not have permission.", 403);
  }

  return user;
}

export async function requireAdmin(): Promise<PublicUser> {
  return requireRole([UserRole.ADMIN]);
}

export async function requireEmployee(): Promise<PublicUser> {
  return requireRole([UserRole.EMPLOYEE]);
}
