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
  managerId: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const createProjectInputSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  managerId: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const createTicketInputSchema = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: ticketTypeSchema,
  priority: ticketPrioritySchema.optional(),
  assigneeId: z.string().optional(),
  reporterId: z.string().optional(),
  sprintId: z.number().int().positive().optional(),
  epicId: z.number().int().positive().optional(),
  points: z.number().int().min(0).optional(),
  originalEstimate: z.number().positive().optional(),
});

export const updateTicketInputSchema = z.object({
  ticketId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: ticketTypeSchema.optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assigneeId: z.string().optional(),
  sprintId: z.number().int().positive().optional(),
  epicId: z.number().int().positive().optional(),
  points: z.number().int().min(0).optional(),
  originalEstimate: z.number().positive().optional(),
});

export const updateTicketStatusInputSchema = z.object({
  ticketId: z.number().int().positive(),
  status: ticketStatusSchema,
});

export const createSprintInputSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().min(1, "Sprint name is required"),
  startDate: z.date(),
  endDate: z.date(),
  goal: z.string().optional(),
});

export const updateSprintInputSchema = z.object({
  sprintId: z.number().int().positive(),
  name: z.string().min(1).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  goal: z.string().optional(),
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED"]).optional(),
});

export const addCommentInputSchema = z.object({
  ticketId: z.number().int().positive(),
  content: z.string().min(1, "Comment is required"),
  parentCommentId: z.number().int().positive().optional(),
});

export const addAttachmentInputSchema = z.object({
  ticketId: z.number().int().positive(),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
});

export const createLabelInputSchema = z.object({
  name: z.string().min(1, "Label name is required"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

export const addTimeEntryInputSchema = z.object({
  ticketId: z.number().int().positive(),
  date: z.date(),
  hours: z.number().positive(),
  description: z.string().optional(),
});
