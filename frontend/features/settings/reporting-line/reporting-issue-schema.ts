import { z } from "zod";
import type { CreateReportingManagerRequestInput } from "@/hooks/api/hr/reporting-manager-requests-schema";

export const EMPLOYEE_REASON_MIN = 20;
export const EMPLOYEE_REASON_MAX = 1000;

const employeeReason = z
  .string()
  .trim()
  .min(EMPLOYEE_REASON_MIN, `Explain in at least ${EMPLOYEE_REASON_MIN} characters`)
  .max(EMPLOYEE_REASON_MAX, `Keep it under ${EMPLOYEE_REASON_MAX} characters`);

export const reportingIssueSchema = z.object({
  reason: employeeReason,
  suggestedManagerUserId: z.string(),
  requestedEffectiveFrom: z.string(),
});

export type ReportingIssueInput = z.input<typeof reportingIssueSchema>;
export type ReportingIssueValues = z.output<typeof reportingIssueSchema>;

/** Blank optional fields are omitted, never sent as "" (the DTO is strict). */
export function toCreateRequestPayload(values: ReportingIssueValues): CreateReportingManagerRequestInput {
  return {
    reason: values.reason,
    ...(values.suggestedManagerUserId ? { suggestedManagerUserId: values.suggestedManagerUserId } : {}),
    ...(values.requestedEffectiveFrom ? { requestedEffectiveFrom: values.requestedEffectiveFrom } : {}),
  };
}

/** CONTRACT Addendum 2: the reply to "more info needed" is 20..1000 like the original reason. */
export const respondSchema = z.object({ reason: employeeReason });

export type RespondInput = z.input<typeof respondSchema>;
export type RespondValues = z.output<typeof respondSchema>;
