import { z } from "zod";

export const createReservationSchema = z
  .object({
    resourceUnitId: z.string().uuid(),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    purpose: z.string().trim().max(2000).optional(),
  })
  .strict();

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
