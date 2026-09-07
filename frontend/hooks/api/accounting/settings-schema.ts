import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const approvalPolicyContract = z.object({
  id: z.number(),
  orgId: z.string(),
  recordType: z.string(),
  minAmount: z.string().nullable(),
  approverRole: z.string().nullable(),
  approverUserId: z.string().nullable(),
  approverMembershipId: z.number().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const approvalPolicyListContract = cursorPageContract(approvalPolicyContract);

export const approvalPolicyCreatedContract = approvalPolicyContract;

export const approvalPolicyUpdatedContract = approvalPolicyContract;

export const approvalPolicyDeletedContract = z.object({ deleted: z.literal(true) });

const approvalRequestBaseContract = z.object({
  id: z.number(),
  orgId: z.string(),
  recordType: z.string(),
  recordId: z.number(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  requestedBy: z.string(),
  note: z.string().nullable(),
  decidedBy: z.string().nullable(),
  decidedAt: z.string().nullable(),
  decisionComment: z.string().nullable(),
  createdAt: z.string(),
});

const approvalRequestEnrichedContract = approvalRequestBaseContract.extend({
  requesterDisplayName: z.string(),
  recordLabel: z.string().nullable(),
  recordAmount: z.string().nullable(),
});

export const approvalQueueContract = cursorPageContract(approvalRequestEnrichedContract);

export const approvalCountsContract = z.object({
  PENDING: z.number(),
  APPROVED: z.number(),
  REJECTED: z.number(),
});

export const approvalDecisionContract = approvalRequestBaseContract;

const exchangeRateContract = z.object({
  id: z.number(),
  orgId: z.string(),
  fromCurrency: z.string(),
  toCurrency: z.string(),
  rate: z.string(),
  asOfDate: z.string(),
  createdAt: z.string(),
});

export const exchangeRateListContract = cursorPageContract(exchangeRateContract);

export const exchangeRateCreatedContract = exchangeRateContract;

export type ApprovalPolicyList = z.infer<typeof approvalPolicyListContract>;
export type ApprovalQueue = z.infer<typeof approvalQueueContract>;
export type ExchangeRateList = z.infer<typeof exchangeRateListContract>;
