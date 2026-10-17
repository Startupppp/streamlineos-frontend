import { z } from "zod";
import { managerRefContract } from "@/hooks/api/hr/reporting-lines-schema";

/** Mirrors backend `dto/reporting-lines-requests.schemas.ts` (CONTRACT §4.8–§4.16). */

export const reportingManagerRequestStatusContract = z.enum([
  "PENDING",
  "MORE_INFO_REQUIRED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
]);

export const myReportingManagerRequestContract = z.object({
  requestId: z.string(),
  status: reportingManagerRequestStatusContract,
  employeeReason: z.string(),
  suggestedManager: managerRefContract.nullable(),
  requestedEffectiveFrom: z.string().nullable(),
  reviewReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
});

export const myReportingManagerRequestPageContract = z.object({
  items: z.array(myReportingManagerRequestContract),
  nextCursor: z.string().nullable(),
});

export const hrReportingManagerRequestContract = myReportingManagerRequestContract.extend({
  employee: managerRefContract,
  currentManager: managerRefContract.nullable(),
});

export const hrReportingManagerRequestPageContract = z.object({
  items: z.array(hrReportingManagerRequestContract),
  nextCursor: z.string().nullable(),
});

export const reviewReportingManagerRequestResponseContract = z.object({
  request: hrReportingManagerRequestContract,
  warnings: z.array(z.string()),
});

export const REVIEW_DECISIONS = ["APPROVE", "REJECT", "CANCEL_DUPLICATE", "REQUEST_INFO"] as const;

export type ReportingManagerRequestStatus = z.infer<typeof reportingManagerRequestStatusContract>;
export type MyReportingManagerRequest = z.infer<typeof myReportingManagerRequestContract>;
export type MyReportingManagerRequestPage = z.infer<typeof myReportingManagerRequestPageContract>;
export type HrReportingManagerRequest = z.infer<typeof hrReportingManagerRequestContract>;
export type HrReportingManagerRequestPage = z.infer<typeof hrReportingManagerRequestPageContract>;
export type ReviewReportingManagerRequestResponse = z.infer<typeof reviewReportingManagerRequestResponseContract>;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export interface CreateReportingManagerRequestInput {
  reason: string;
  suggestedManagerUserId?: string;
  requestedEffectiveFrom?: string;
}

export interface ReviewReportingManagerRequestInput {
  decision: ReviewDecision;
  managerUserId?: string;
  effectiveFrom?: string;
  reviewReason: string;
}
