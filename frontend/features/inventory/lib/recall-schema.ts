import { z } from "zod";

export const createRecallSchema = z.object({
  title: z.string().min(1, "Required"),
  reason: z.string().min(1, "Required"),
  severity: z.string().optional(),
  lotIdsRaw: z.string().optional(),
  serialIdsRaw: z.string().optional(),
});

export type CreateRecallFormValues = z.infer<typeof createRecallSchema>;
