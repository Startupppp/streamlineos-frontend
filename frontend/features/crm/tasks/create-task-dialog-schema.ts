import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  type: z.enum(["CALL", "EMAIL", "MEETING", "DEMO", "FOLLOW_UP", "REMINDER", "CUSTOM"]),
  notes: z.string().optional(),
  entityType: z.enum(["LEAD", "DEAL", "CONTACT"]).optional(),
  entityIdRaw: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
