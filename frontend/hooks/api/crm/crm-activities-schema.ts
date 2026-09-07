import { z } from "zod";

const taskRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  entityType: z.enum(["LEAD", "DEAL", "CONTACT"]).nullable(),
  entityId: z.number().int().nullable(),
  type: z.enum(["CALL", "EMAIL", "MEETING", "CUSTOM"]),
  status: z.enum(["pending", "completed", "cancelled"]),
  snoozedUntil: z.string().nullable(),
  assigneeId: z.string().nullable(),
  assigneeMembershipId: z.number().int().nullable(),
  createdBy: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  dueDate: z.string().nullable(),
  remindAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  timezone: z.string().nullable(),
  recurrence: z.record(z.string(), z.unknown()).nullable(),
  parentTaskId: z.number().int().nullable(),
  isTemplate: z.boolean(),
  templateName: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const tasksListContract = z.object({
  tasks: z.array(taskRowSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export const taskRowContract = taskRowSchema;
