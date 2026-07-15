import { z } from "zod";
import { HR_POLICY_TYPES, HR_SCOPE_TYPES } from "@/types/hr/policies";

export const policyFormSchema = z.object({
  policyType: z.enum(HR_POLICY_TYPES),
  name: z.string().min(1, "Name is required").max(200),
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
});

export type PolicyFormValues = z.infer<typeof policyFormSchema>;
