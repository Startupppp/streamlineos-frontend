import { z } from "zod";

export const policySchema = z.object({
  name: z.string().min(1, "Name is required"),
  leaveTypeId: z.string().min(1, "Leave type is required"),
  accrualType: z.enum(["ANNUAL", "MONTHLY", "DAILY"]),
  accrualRate: z.string().min(1, "Accrual rate is required"),
  maxBalance: z.string().optional(),
  carryForwardDays: z.string(),
  encashable: z.boolean(),
  probationRestricted: z.boolean(),
  effectiveFrom: z.string().min(1, "Effective date is required"),
});

export type PolicyFormValues = z.infer<typeof policySchema>;

export const ACCRUAL_LABELS: Record<string, string> = {
  ANNUAL: "days/year",
  MONTHLY: "days/month",
  DAILY: "days/day",
};

export const emptyPolicyDefaults: PolicyFormValues = {
  accrualType: "ANNUAL",
  carryForwardDays: "0",
  encashable: false,
  probationRestricted: false,
  name: "",
  leaveTypeId: "",
  accrualRate: "",
  maxBalance: "",
  effectiveFrom: "",
};

export function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? undefined : trimmed;
}
