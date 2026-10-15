export type UserRole = "ADMIN" | "EMPLOYEE";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: AuthUser;
  redirectTo: string;
}
