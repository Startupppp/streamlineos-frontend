import { z } from "zod";

export const createTicketFromCalendarSchema = z.object({
  projectId: z.string().min(1, "Select a project"),
  title: z.string().min(1, "Title is required"),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

export type CreateTicketFromCalendarInput = z.infer<typeof createTicketFromCalendarSchema>;
