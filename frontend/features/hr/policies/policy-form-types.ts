import { z } from "zod";
import { HR_POLICY_TYPES, HR_SCOPE_TYPES } from "@/types/hr/policies";

export const policyFormSchema = z.object({
  policyType: z.enum(HR_POLICY_TYPES),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  priority: z.number().int().min(0).max(9999),
  rules: z.record(z.string(), z.unknown()),
  scopes: z
    .array(
      z
        .object({
          scopeType: z.enum(HR_SCOPE_TYPES),
          scopeValue: z.string(),
        })
        .refine(
          (s) => s.scopeType === "organization" || s.scopeValue.length > 0,
          { message: "Scope value is required", path: ["scopeValue"] },
        ),
    )
    .min(1, "At least one scope is required"),
}).superRefine((data, ctx) => {
  if (data.policyType === "leave") {
    const v = data.rules["accrualAmount"];
    if (typeof v === "number") {
      if (v < 0) {
        ctx.addIssue({ code: "custom", message: "Accrual must be 0 or more", path: ["rules", "accrualAmount"] });
      } else if (v > 365) {
        ctx.addIssue({ code: "custom", message: "Accrual cannot exceed 365 days", path: ["rules", "accrualAmount"] });
      } else if (Math.round(v * 100) !== v * 100) {
        ctx.addIssue({ code: "custom", message: "Accrual can have at most 2 decimal places", path: ["rules", "accrualAmount"] });
      }
    }
  }
});

export type PolicyFormValues = z.infer<typeof policyFormSchema>;
