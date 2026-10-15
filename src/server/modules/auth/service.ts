import "server-only";

import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

import { authRepository } from "./repository";
import { signSessionToken } from "@/server/auth/jwt";

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export const authService = {
  async login(email: string, password: string) {
    const user = await authRepository.findUserByEmail(
      email.toLowerCase().trim(),
    );

    if (!user || !user.isActive) {
      throw new AuthError("Invalid email or password.");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      throw new AuthError("Invalid email or password.");
    }

    const token = await signSessionToken({
      userId: user.id,
      role: user.role,
    });

    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return {
      token,
      user: publicUser,
      redirectTo: user.role === UserRole.ADMIN ? "/admin" : "/employee",
    };
  },

  async getCurrentUser(userId: string): Promise<PublicUser | null> {
    const user = await authRepository.findUserById(userId);

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  },
};
