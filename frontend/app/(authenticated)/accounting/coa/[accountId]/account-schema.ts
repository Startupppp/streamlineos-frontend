import { z } from "zod";

export const editAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(500).optional(),
  isActive: z.boolean(),
});

export type EditAccountValues = z.infer<typeof editAccountSchema>;
