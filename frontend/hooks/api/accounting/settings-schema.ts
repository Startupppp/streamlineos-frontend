import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const approvalPolicyConditionContract = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown(),
});

const approvalPolicyStepContract = z.object({
  order: z.number(),
  approverType: z.string(),
  approverId: z.string().nullable(),
  approverRole: z.string().nullable(),
});

const approvalPolicyContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  entityType: z.string(),
  isActive: z.boolean(),
  conditions: z.array(approvalPolicyConditionContract),
  steps: z.array(approvalPolicyStepContract),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const approvalPolicyListContract = z.array(approvalPolicyContract);

export const approvalPolicyCreatedContract = approvalPolicyContract;

export const approvalPolicyUpdatedContract = approvalPolicyContract;

export const approvalPolicyDeletedContract = z.object({ success: z.literal(true) });

const approvalQueueItemContract = z.object({
  id: z.number(),
  orgId: z.string(),
  entityType: z.string(),
  entityId: z.number(),
  status: z.string(),
  requestedBy: z.string(),
  requestedAt: z.string(),
  decidedBy: z.string().nullable(),
  decidedAt: z.string().nullable(),
  notes: z.string().nullable(),
  entitySummary: z.record(z.string(), z.unknown()).nullable(),
});

export const approvalQueueContract = cursorPageContract(approvalQueueItemContract);

export const approvalCountsContract = z.object({
  pending: z.number(),
  approved: z.number(),
  rejected: z.number(),
  total: z.number(),
});

export const approvalDecisionContract = z.object({
  id: z.number(),
  status: z.string(),
});

const exchangeRateContract = z.object({
  id: z.number(),
  orgId: z.string(),
  fromCurrency: z.string(),
  toCurrency: z.string(),
  rate: z.string(),
  effectiveDate: z.string(),
  source: z.string(),
  createdAt: z.string(),
});

export const exchangeRateListContract = z.object({
  items: z.array(exchangeRateContract),
  pagination: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const exchangeRateCreatedContract = exchangeRateContract;

export type ApprovalPolicyList = z.infer<typeof approvalPolicyListContract>;
export type ApprovalQueue = z.infer<typeof approvalQueueContract>;
export type ExchangeRateList = z.infer<typeof exchangeRateListContract>;
