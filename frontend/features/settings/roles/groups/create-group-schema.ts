import { z } from "zod";

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .trim(),
});

export type CreateGroupFormValues = z.infer<typeof createGroupSchema>;
