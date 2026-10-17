import { z } from "zod";
import type { ReportingManagerPolicy } from "@/hooks/api/hr/reporting-lines-schema";
import type { UpdateReportingManagerPolicyInput } from "@/hooks/api/hr/reporting-manager-policy";

export const reportingManagerPolicyFormSchema = z.object({
  defaultPrimaryManagerUserId: z.string().nullable(),
  fallbackOrder: z.enum(["CONFIGURED_MANAGER_THEN_UPLOADER", "UPLOADER_THEN_CONFIGURED_MANAGER"]),
  maxSecondaryManagersPerEmployee: z.number().int().min(0).max(3),
  requireReasonAfterChanges: z
    .number({ error: "Enter a number from 1 to 10" })
    .int("Enter a whole number")
    .min(1, "At least 1")
    .max(10, "At most 10"),
  allowTopLevelWithoutManager: z.boolean(),
});

export type ReportingManagerPolicyFormValues = z.infer<typeof reportingManagerPolicyFormSchema>;

export function policyToFormValues(policy: ReportingManagerPolicy): ReportingManagerPolicyFormValues {
  return {
    defaultPrimaryManagerUserId: policy.defaultPrimaryManager?.userId ?? null,
    fallbackOrder: policy.fallbackOrder,
    maxSecondaryManagersPerEmployee: policy.maxSecondaryManagersPerEmployee,
    requireReasonAfterChanges: policy.requireReasonAfterChanges,
    allowTopLevelWithoutManager: policy.allowTopLevelWithoutManager,
  };
}

/** Sends only what changed, pinned to the version the form was loaded from. */
export function policyPatch(
  policy: ReportingManagerPolicy,
  values: ReportingManagerPolicyFormValues,
): UpdateReportingManagerPolicyInput {
  const current = policyToFormValues(policy);
  return {
    expectedVersion: policy.version,
    ...(values.defaultPrimaryManagerUserId !== current.defaultPrimaryManagerUserId
      ? { defaultPrimaryManagerUserId: values.defaultPrimaryManagerUserId }
      : {}),
    ...(values.fallbackOrder !== current.fallbackOrder ? { fallbackOrder: values.fallbackOrder } : {}),
    ...(values.maxSecondaryManagersPerEmployee !== current.maxSecondaryManagersPerEmployee
      ? { maxSecondaryManagersPerEmployee: values.maxSecondaryManagersPerEmployee }
      : {}),
    ...(values.requireReasonAfterChanges !== current.requireReasonAfterChanges
      ? { requireReasonAfterChanges: values.requireReasonAfterChanges }
      : {}),
    ...(values.allowTopLevelWithoutManager !== current.allowTopLevelWithoutManager
      ? { allowTopLevelWithoutManager: values.allowTopLevelWithoutManager }
      : {}),
  };
}

export const FALLBACK_ORDER_OPTIONS = [
  {
    value: "CONFIGURED_MANAGER_THEN_UPLOADER",
    label: "Default manager first, then the uploader",
    description:
      "A blank manager goes to the default reporting manager. If they cannot be assigned, it goes to the HR administrator doing the upload.",
  },
  {
    value: "UPLOADER_THEN_CONFIGURED_MANAGER",
    label: "Uploader first, then the default manager",
    description:
      "A blank manager goes to the HR administrator doing the upload. If they cannot be assigned, it goes to the default reporting manager.",
  },
] as const;
