import { z } from "zod";

export const bulkCreateUnitsSchema = z
  .object({
    resourceTypeId: z.string().uuid(),

    quantity: z.number().int().min(1).max(100),

    codePrefix: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .regex(/^[A-Za-z0-9-]+$/)
      .transform((value) => value.toUpperCase()),

    startNumber: z.number().int().min(1).max(999999),

    namePrefix: z.string().trim().max(100).optional(),
  })
  .strict();

export type BulkCreateUnitsInput = z.infer<typeof bulkCreateUnitsSchema>;
