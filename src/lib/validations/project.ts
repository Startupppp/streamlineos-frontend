import { z } from "zod";

export const projectStatusSchema = z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]);

export const ticketTypeSchema = z.enum(["BUG", "FEATURE", "TASK", "EPIC", "STORY"]);
export const ticketStatusSchema = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
export const ticketPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const updateProjectSettingsInputSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  status: projectStatusSchema,
});

export const createTicketInputSchema = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: ticketTypeSchema,
  priority: ticketPrioritySchema.optional(),
  assigneeId: z.string().optional(),
});

export const updateTicketStatusInputSchema = z.object({
  ticketId: z.number().int().positive(),
  status: ticketStatusSchema,
});
