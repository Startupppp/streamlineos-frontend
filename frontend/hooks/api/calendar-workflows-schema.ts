import { z } from "zod";

export const calendarWorkflowTriggers = [
  "calendar.booking.created",
  "calendar.booking.changed",
  "calendar.booking.rescheduled",
  "calendar.booking.cancelled",
  "calendar.booking.no_show",
  "calendar.booking.started",
  "calendar.booking.ended",
  "calendar.booking.failed",
  "calendar.booking.repaired",
  "calendar.event.created",
  "calendar.event.changed",
  "calendar.event.rescheduled",
  "calendar.event.cancelled",
  "calendar.event.no_show",
  "calendar.event.started",
  "calendar.event.ended",
  "calendar.event.failed",
  "calendar.event.repaired",
  "calendar.source.changed",
] as const;

export const calendarWorkflowChannels = [
  "IN_APP",
  "EMAIL",
  "PUSH",
  "SMS",
  "WHATSAPP",
] as const;

const channelSchema = z.enum(calendarWorkflowChannels);
const triggerSchema = z.enum(calendarWorkflowTriggers);
const conditionSchema = z.object({
  field: z.enum([
    "aggregate_type",
    "lifecycle_state",
    "start_at",
    "end_at",
    "occurrence_id",
    "source_key",
    "source_status",
  ]),
  op: z.enum(["eq", "neq", "in", "exists"]),
  value: z.union([z.string(), z.boolean(), z.array(z.string())]).optional(),
});
const recipientSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("actor") }),
  z.object({ type: z.literal("organizer") }),
  z.object({ type: z.literal("attendees") }),
  z.object({ type: z.literal("members"), membershipIds: z.array(z.number().int().positive()) }),
]);
export const calendarWorkflowActionSchema = z.object({
  type: z.literal("notification"),
  recipients: recipientSchema,
  channels: z.array(channelSchema),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  title: z.string(),
  message: z.string(),
  link: z.string().nullable(),
});

export const calendarWorkflowPolicyContract = z.object({
  version: z.number().int().positive(),
  enabled: z.boolean(),
  dryRun: z.boolean(),
  allowedChannels: z.array(channelSchema),
  maxRules: z.number().int().positive(),
  maxEffectsPerEvent: z.number().int().positive(),
  maxEffectsPerDay: z.number().int().positive(),
  updatedAt: z.string(),
});

export const calendarWorkflowRuleContract = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(["active", "disabled"]),
  version: z.number().int().positive(),
  triggers: z.array(triggerSchema),
  conditions: z.array(conditionSchema),
  actions: z.array(calendarWorkflowActionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const calendarWorkflowRulesContract = z.array(calendarWorkflowRuleContract);

export const calendarWorkflowEffectContract = z.object({
  id: z.string().uuid(),
  ruleId: z.number().int().positive(),
  ruleVersion: z.number().int().positive(),
  policyVersion: z.number().int().positive(),
  producerEventId: z.string(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  aggregateVersion: z.number().int().positive(),
  triggerEvent: triggerSchema,
  actionIndex: z.number().int().nonnegative(),
  action: calendarWorkflowActionSchema,
  status: z.enum(["PENDING", "IN_FLIGHT", "SUCCEEDED", "FAILED", "DEAD_LETTERED", "SUPPRESSED", "DRY_RUN"]),
  version: z.number().int().positive(),
  attemptCount: z.number().int().nonnegative(),
  replayCount: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  nextAttemptAt: z.string().nullable(),
  providerReceiptId: z.string().nullable(),
  lastError: z.string().nullable(),
  suppressionReason: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const calendarWorkflowLegacyEffectsContract = z.array(calendarWorkflowEffectContract);

export const calendarWorkflowEffectsContract = z.object({
  items: z.array(calendarWorkflowEffectContract),
  nextCursor: z.string().uuid().nullable(),
});
export const calendarWorkflowDryRunContract = z.object({
  matchedRuleIds: z.array(z.number().int().positive()),
  effects: z.array(z.object({
    ruleId: z.number().int().positive(),
    ruleName: z.string(),
    actionIndex: z.number().int().nonnegative(),
    action: calendarWorkflowActionSchema,
  })),
  limited: z.boolean(),
});

export type CalendarWorkflowPolicy = z.infer<typeof calendarWorkflowPolicyContract>;
export type CalendarWorkflowRule = z.infer<typeof calendarWorkflowRuleContract>;
export type CalendarWorkflowEffect = z.infer<typeof calendarWorkflowEffectContract>;
export type CalendarWorkflowEffectPage = z.infer<typeof calendarWorkflowEffectsContract>;
export type CalendarWorkflowDryRun = z.infer<typeof calendarWorkflowDryRunContract>;
export type CalendarWorkflowTrigger = (typeof calendarWorkflowTriggers)[number];
export type CalendarWorkflowChannel = (typeof calendarWorkflowChannels)[number];
export type CalendarWorkflowAction = z.infer<typeof calendarWorkflowActionSchema>;
