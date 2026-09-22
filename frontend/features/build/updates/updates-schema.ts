import { z } from "zod";

export const createUpdateSchema = z.object({
  body: z.string().min(1, "Update body is required").max(10000),
});

export type CreateUpdateInput = z.infer<typeof createUpdateSchema>;
