import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address.")
    .max(255)
    .transform((email) => email.toLowerCase()),

  password: z.string().min(1, "Password is required.").max(1024),
});

export type LoginInput = z.infer<typeof loginSchema>;
