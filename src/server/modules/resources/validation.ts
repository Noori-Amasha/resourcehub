import { z } from "zod";

const nameField = z.string().trim().min(2).max(120);

export const categoryCreateSchema = z
  .object({
    name: nameField,
    description: z.string().trim().max(2000).nullish(),
  })
  .strict();

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field.",
  );

export const typeCreateSchema = z
  .object({
    categoryId: z.string().uuid(),
    name: nameField,
    description: z.string().trim().max(2000).nullish(),
  })
  .strict();

export const typeUpdateSchema = typeCreateSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field.",
  );

export const unitCreateSchema = z
  .object({
    resourceTypeId: z.string().uuid(),
    unitCode: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens only.")
      .transform((v) => v.toUpperCase()),
    name: z.string().trim().max(120).nullish(),
    description: z.string().trim().max(2000).nullish(),
  })
  .strict();

export const unitUpdateSchema = z
  .object({
    resourceTypeId: z.string().uuid().optional(),
    unitCode: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[A-Za-z0-9-]+$/)
      .transform((v) => v.toUpperCase())
      .optional(),
    name: z.string().trim().max(120).nullish(),
    description: z.string().trim().max(2000).nullish(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field.",
  );

export const uuidSchema = z.string().uuid();

export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
export type TypeCreate = z.infer<typeof typeCreateSchema>;
export type TypeUpdate = z.infer<typeof typeUpdateSchema>;
export type UnitCreate = z.infer<typeof unitCreateSchema>;
export type UnitUpdate = z.infer<typeof unitUpdateSchema>;
