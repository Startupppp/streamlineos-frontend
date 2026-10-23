import { z } from "zod";

export const createWorkflowSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
  description: z.string().optional(),
});

export type CreateWorkflowValues = z.infer<typeof createWorkflowSchema>;
