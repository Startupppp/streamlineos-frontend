import { z } from "zod";


export const commissionRuleSetSchema = z.object({
  basis: z.string(),
  period: z.enum(["MONTH", "QUARTER", "YEAR"]),
  quotaMinor: z.number().int().nullable(),
  tiers: z.array(z.object({ from: z.number(), rateBps: z.number().int() })),
  accelerators: z.array(z.object({ aboveBps: z.number().int(), multiplierBps: z.number().int() })),
  capMinor: z.number().int().nullable(),
});

const planSchema = z.object({
  planId: z.string(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  currency: z.string(),
  retiredOn: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const versionSchema = z.object({
  planVersionId: z.string(),
  orgId: z.string(),
  planId: z.string(),
  versionNumber: z.number().int(),
  effectiveFrom: z.string(),
  rules: commissionRuleSetSchema,
  sealedAt: z.string().nullable(),
  note: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const assignmentSchema = z.object({
  assignmentId: z.string(),
  orgId: z.string(),
  planId: z.string(),
  userId: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  quotaOverrideMinor: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const earningSchema = z.object({
  earningId: z.string(),
  orgId: z.string(),
  planId: z.string(),
  planVersionId: z.string(),
  userId: z.string(),
  earnedOn: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  sourceType: z.string(),
  sourceId: z.string(),
  basisMinor: z.number().int(),
  priorBasisMinor: z.number().int(),
  amountMinor: z.number().int(),
  currency: z.string(),
  effectiveRateBps: z.number().int(),
  attainmentBps: z.number().int().nullable(),
  computation: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(["CALCULATED", "APPROVED", "PAID", "VOID"]),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const commissionPlanDetailContract = z.object({
  plan: planSchema,
  versions: z.array(versionSchema),
  assignments: z.array(assignmentSchema),
});

export const createCommissionPlanContract = z.object({ plan: planSchema, version: versionSchema });
export const commissionPlanContract = planSchema;
export const commissionVersionContract = versionSchema;
export const commissionAssignmentContract = assignmentSchema;
export const calculateCommissionContract = z.object({
  earning: earningSchema.nullable(),
  created: z.boolean(),
});
export const rebuildAccrualContract = z.object({
  examined: z.number().int(),
  rebuilt: z.number().int(),
  partsWritten: z.number().int(),
  drifted: z.array(z.string()),
  skipped: z.array(z.string()),
});

export type CommissionRuleSet = z.infer<typeof commissionRuleSetSchema>;
export type CommissionPlanDetail = z.infer<typeof commissionPlanDetailContract>;
export type CommissionPlanVersion = z.infer<typeof versionSchema>;
export type CommissionAssignment = z.infer<typeof assignmentSchema>;
export type CommissionRebuildResult = z.infer<typeof rebuildAccrualContract>;
