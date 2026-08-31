import { z } from "zod";

export const convertToTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  projectId: z.string().min(1, "Select a project"),
  type: z.enum(["TASK", "BUG"]),
});

export type ConvertToTaskFormValues = z.infer<typeof convertToTaskSchema>;
