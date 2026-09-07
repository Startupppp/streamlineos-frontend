import { z } from "zod";

export const orgSetupSessionContract = z.object({
  id: z.number().int(),
  type: z.string(),
  status: z.string(),
  currentStep: z.string().nullable(),
  completedSteps: z.array(z.string()),
  skippedSteps: z.array(z.string()),
  data: z.record(z.string(), z.unknown()),
  orgId: z.string().optional(),
  userId: z.string().optional(),
  membershipId: z.number().int().nullable().optional(),
  source: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  lastSeenAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const orgSetupCompleteContract = z.union([
  z.object({ success: z.literal(true), orgId: z.string(), autoLoginToken: z.string() }),
  z.object({ success: z.literal(true), orgId: z.string() }),
]);

export const orgSetupSkipContract = z.union([
  z.object({ success: z.literal(true), orgId: z.string(), autoLoginToken: z.string() }),
  z.object({ success: z.literal(true), orgId: z.string() }),
]);
