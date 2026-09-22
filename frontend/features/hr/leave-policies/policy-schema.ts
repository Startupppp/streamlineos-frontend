import { z } from "zod";
import type { LeavePolicy } from "@/hooks/api/hr/leave-policies";

const accrualTypeSchema = z.enum(["ANNUAL", "MONTHLY", "DAILY"]);

export const policySchema = z.object({
  name: z.string().trim().min(1, "Policy name is required"),
  leaveTypeId: z.string().min(1, "Leave type is required"),
  accrualType: accrualTypeSchema,
  accrualRate: z
    .string()
    .trim()
    .min(1, { message: "Accrual rate is required", abort: true })
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, "Accrual rate must be 0 or more"),
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
  name: "Annual Leave Policy",
  leaveTypeId: "",
  accrualRate: "12",
  maxBalance: "",
  effectiveFrom: "",
};

export function policyFormValues(policy: LeavePolicy | null): PolicyFormValues {
  if (!policy) return emptyPolicyDefaults;
  const accrualType = accrualTypeSchema.safeParse(policy.accrualType);
  return {
    name: policy.name,
    leaveTypeId: String(policy.leaveTypeId),
    accrualType: accrualType.success ? accrualType.data : "ANNUAL",
    accrualRate: policy.accrualRate,
    maxBalance: policy.maxBalance ?? "",
    carryForwardDays: policy.carryForwardDays,
    encashable: policy.encashable,
    probationRestricted: policy.probationRestricted,
    effectiveFrom: policy.effectiveFrom.slice(0, 10),
  };
}
