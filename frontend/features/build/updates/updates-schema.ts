import { z } from "zod";

export const createUpdateSchema = z.object({
  body: z.string().min(1, "Update body is required").max(10000),
  wins: z.string().max(10000).nullable().optional(),
  risks: z.string().max(10000).nullable().optional(),
  next: z.string().max(10000).nullable().optional(),
  citations: z.string().max(10000).nullable().optional(),
});

export type CreateUpdateInput = z.infer<typeof createUpdateSchema>;
