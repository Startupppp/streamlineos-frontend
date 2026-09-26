import { z } from "zod";
import {
  REVIEW_DECISIONS,
  type ReviewDecision,
  type ReviewReportingManagerRequestInput,
} from "@/hooks/api/hr/reporting-manager-requests-schema";

export const reviewDecisionSchema = z
  .object({
    decision: z.enum(REVIEW_DECISIONS),
    managerUserId: z.string(),
    effectiveFrom: z.string(),
    reviewReason: z
      .string()
      .trim()
      .min(1, "Give a reason for this decision")
      .max(1000, "Keep the reason under 1,000 characters"),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "APPROVE" && !value.managerUserId)
      ctx.addIssue({ code: "custom", path: ["managerUserId"], message: "Choose the new primary manager" });
  });

export type ReviewDecisionInput = z.input<typeof reviewDecisionSchema>;
export type ReviewDecisionValues = z.output<typeof reviewDecisionSchema>;

/** Only APPROVE carries a manager and date; a blank date is omitted so the server uses the org-local day. */
export function toReviewPayload(values: ReviewDecisionValues): ReviewReportingManagerRequestInput {
  if (values.decision !== "APPROVE") return { decision: values.decision, reviewReason: values.reviewReason };
  return {
    decision: "APPROVE",
    managerUserId: values.managerUserId,
    ...(values.effectiveFrom ? { effectiveFrom: values.effectiveFrom } : {}),
    reviewReason: values.reviewReason,
  };
}

export const DECISION_LABEL: Record<ReviewDecision, string> = {
  APPROVE: "Approve and change the manager",
  REJECT: "Reject",
  CANCEL_DUPLICATE: "Cancel as a duplicate",
  REQUEST_INFO: "Ask the employee for more information",
};

export const DECISION_REASON_LABEL: Record<ReviewDecision, string> = {
  APPROVE: "Reason for the change",
  REJECT: "Reason shown to the employee",
  CANCEL_DUPLICATE: "Reason shown to the employee",
  REQUEST_INFO: "What the employee should tell you",
};

export function decisionToast(decision: ReviewDecision, employeeName: string): string {
  switch (decision) {
    case "APPROVE":
      return `Approved — ${employeeName}'s reporting manager was changed`;
    case "REJECT":
      return `Rejected ${employeeName}'s request`;
    case "CANCEL_DUPLICATE":
      return `Cancelled ${employeeName}'s request as a duplicate`;
    case "REQUEST_INFO":
      return `Asked ${employeeName} for more information`;
  }
}
