import { z } from "zod";

/**
 * Response contracts for the tasks module.
 * Derived from backend `tasks-response.schemas.ts`.
 * wireDate() → z.string() on the wire.
 * NOT `.strict()`.
 */

/** `taskRowSchema` */
export const taskRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  entityType: z.enum(["LEAD", "DEAL", "CONTACT", "PROJECT"]).nullable(),
  entityId: z.number().int().nullable(),
  type: z.enum(["CALL", "EMAIL", "MEETING", "DEMO", "FOLLOW_UP", "REMINDER", "CUSTOM"]),
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
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** `taskAnalyticsSchema` */
export const taskAnalyticsContract = z.object({
  period: z.number().int(),
  total: z.number().int(),
  completed: z.number().int(),
  overdue: z.number().int(),
  completionRate: z.number().int(),
  perRep: z.array(
    z.object({
      assigneeId: z.string().nullable(),
      name: z.string(),
      total: z.number().int(),
      completed: z.number().int(),
      overdue: z.number().int(),
      completionRate: z.number().int(),
    }),
  ),
});

/** `taskSuccessSchema` */
export const taskSuccessContract = z.object({ success: z.literal(true) });

/**
 * `tasksListResponseSchema` — a keyset page. `total` is present only on the
 * first page (the service skips the count once a cursor is supplied), and there
 * is no `page`/`limit`.
 */
export const tasksListContract = z.object({
  tasks: z.array(taskRowContract),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  total: z.number().int().optional(),
});
