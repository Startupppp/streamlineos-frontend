import { z } from "zod";

export const editAccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
});

export type EditAccountValues = z.infer<typeof editAccountSchema>;
