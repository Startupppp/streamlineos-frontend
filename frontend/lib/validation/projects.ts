import { z } from "zod";

const projectStatusSchema = z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]);

const ticketTypeSchema = z.enum(["EPIC", "STORY", "TASK", "BUG"]);
const ticketPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const updateProjectSettingsInputSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().max(2000).optional(),
  status: projectStatusSchema,
  managerId: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  memberIds: z.array(z.string()).optional(),
});

export const createTicketInputSchema = z.object({
  projectId: z.number().int().positive(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(500)
    .refine((v) => v.trim().length >= 3, { message: "Title must be at least 3 characters" })
    .refine((v) => /[a-zA-Z0-9]/.test(v.trim()), { message: "Title must contain at least one letter or number" }),
  description: z.string().max(5000).optional(),
  type: ticketTypeSchema,
  priority: ticketPrioritySchema.optional(),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  reporterId: z.string().optional(),
  sprintId: z.number().int().positive().optional(),
  epicId: z.number().int().positive().optional(),
  cycleId: z.number().int().positive().optional(),
  labelIds: z.array(z.number().int().positive()).optional(),
  points: z.number().int().min(0).optional(),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  originalEstimate: z.number().positive().optional(),
  parentTicketId: z.number().int().positive().optional(),
  status: z.string().optional(),
});
