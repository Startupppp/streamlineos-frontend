import { z } from "zod";

export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export type CreateWorkflowValues = z.infer<typeof createWorkflowSchema>;
