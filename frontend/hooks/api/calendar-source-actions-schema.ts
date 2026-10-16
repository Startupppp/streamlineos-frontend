import { z } from "zod";

export const calendarSourceActionImpactContract = z.object({
  title: z.string(),
  summary: z.string(),
  changes: z.array(z.object({
    field: z.string(),
    before: z.string().nullable(),
    after: z.string().nullable(),
  })),
  warnings: z.array(z.string()),
});

export const calendarSourceActionStepContract = z.object({
  id: z.string().uuid(),
  ordinal: z.number().int().nonnegative(),
  sourceKey: z.string(),
  sourceRecordId: z.string(),
  entityType: z.string(),
  sourceActionId: z.string(),
  expectedSourceVersion: z.string(),
  intendedEffect: z.string(),
  input: z.record(z.string(), z.unknown()),
  impactPreview: calendarSourceActionImpactContract,
  status: z.enum(["PENDING", "DECLINED", "RUNNING", "COMMITTED", "FAILED", "UNCERTAIN"]),
  version: z.number().int().positive(),
  attemptCount: z.number().int().nonnegative(),
  outcomeCode: z.string().nullable(),
  outcomeMessage: z.string().nullable(),
  sourceReceipt: z.record(z.string(), z.unknown()).nullable(),
  repairState: z.enum(["NONE", "AVAILABLE", "REQUESTED", "RESOLVED", "MANUAL_REVIEW"]),
  repairOptions: z.array(z.enum(["retry", "compensate", "accept_partial", "manual_review"])),
  confirmedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});

export const calendarSourceActionProposalContract = z.object({
  id: z.string().uuid(),
  status: z.enum(["PROPOSED", "APPLYING", "COMPLETED", "PARTIAL", "EXPIRED", "CANCELLED"]),
  version: z.number().int().positive(),
  expiresAt: z.string().datetime(),
  confirmedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  steps: z.array(calendarSourceActionStepContract),
});

export const calendarSourceActionProposalListContract = z.array(calendarSourceActionProposalContract);

export const calendarSourceActionCapabilitiesContract = z.object({
  sourceKeys: z.array(z.string()),
});

export type CalendarSourceActionProposal = z.infer<typeof calendarSourceActionProposalContract>;
export type CalendarSourceActionRepair = z.infer<typeof calendarSourceActionStepContract>["repairOptions"][number];
