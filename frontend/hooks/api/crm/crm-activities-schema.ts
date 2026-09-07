import { z } from "zod";

const taskRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  entityType: z.string().nullable(),
  entityId: z.number().int().nullable(),
  type: z.string(),
  status: z.string(),
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
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const tasksListContract = z.object({
  tasks: z.array(taskRowSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  total: z.number().int().optional(),
});

export const taskRowContract = taskRowSchema;
