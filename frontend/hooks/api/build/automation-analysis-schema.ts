import { z } from "zod";

export const dryRunTicketInputSchema = z.object({
  ticketId: z.number().int().positive().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
});

export type DryRunTicketInput = z.infer<typeof dryRunTicketInputSchema>;

export const automationDryRunResultContract = z.object({
  items: z.array(
    z.object({
      ruleId: z.number().int(),
      matched: z.boolean(),
      actions: z.array(z.object({ type: z.string(), value: z.string() })),
    }),
  ),
});

export type AutomationDryRunResult = z.infer<typeof automationDryRunResultContract>;
export type AutomationDryRunItem = AutomationDryRunResult["items"][number];

export const automationReplayResultContract = z.object({
  replayedCount: z.number().int().nonnegative(),
  outcome: z.string().min(1),
});

export type AutomationReplayResult = z.infer<typeof automationReplayResultContract>;

const automationRunActionRowContract = z.object({
  id: z.number().int(),
  actionIndex: z.number().int(),
  actionType: z.string(),
  outcome: z.enum(["success", "failure"]),
  errorMessage: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});

export const automationRunRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  projectId: z.number().int(),
  automationId: z.number().int().nullable(),
  ticketId: z.number().int().nullable(),
  triggerEvent: z.string(),
  matched: z.boolean(),
  outcome: z.enum([
    "matched_success",
    "matched_partial_failure",
    "matched_failed",
    "not_matched",
    "blocked_loop_guard",
    "blocked_rate_limit",
    "error",
  ]),
  errorMessage: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  actions: z.array(automationRunActionRowContract),
});

export type AutomationRunRow = z.infer<typeof automationRunRowContract>;

export const automationRunListContract = z.object({
  items: z.array(automationRunRowContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});
