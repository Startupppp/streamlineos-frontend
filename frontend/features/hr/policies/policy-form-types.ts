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
    const accrual = data.rules["accrualAmount"];
    if (typeof accrual === "number") {
      if (accrual < 0) {
        ctx.addIssue({ code: "custom", message: "Accrual must be 0 or more", path: ["rules", "accrualAmount"] });
      } else if (accrual > 365) {
        ctx.addIssue({ code: "custom", message: "Accrual cannot exceed 365 days", path: ["rules", "accrualAmount"] });
      } else if (Math.round(accrual * 100) !== accrual * 100) {
        ctx.addIssue({ code: "custom", message: "Accrual can have at most 2 decimal places", path: ["rules", "accrualAmount"] });
      }
    }

    const mb = data.rules["maxBalance"];
    if (typeof mb === "number") {
      if (mb < 0) {
        ctx.addIssue({ code: "custom", message: "Max balance must be 0 or more", path: ["rules", "maxBalance"] });
      } else if (mb > 365) {
        ctx.addIssue({ code: "custom", message: "Max balance cannot exceed 365 days", path: ["rules", "maxBalance"] });
      } else if (Math.round(mb * 100) !== mb * 100) {
        ctx.addIssue({ code: "custom", message: "Max balance can have at most 2 decimal places", path: ["rules", "maxBalance"] });
      }
    }

    const cfl = data.rules["carryForwardLimit"];
    if (typeof cfl === "number") {
      if (cfl < 0) {
        ctx.addIssue({ code: "custom", message: "Carry forward must be 0 or more", path: ["rules", "carryForwardLimit"] });
      } else if (cfl > 365) {
        ctx.addIssue({ code: "custom", message: "Carry forward cannot exceed 365 days", path: ["rules", "carryForwardLimit"] });
      } else if (Math.round(cfl * 100) !== cfl * 100) {
        ctx.addIssue({ code: "custom", message: "Carry forward can have at most 2 decimal places", path: ["rules", "carryForwardLimit"] });
      } else if (typeof mb === "number" && cfl > mb) {
        ctx.addIssue({ code: "custom", message: "Carry forward cannot exceed the max balance", path: ["rules", "carryForwardLimit"] });
      }
    }
  }
});

export type PolicyFormValues = z.infer<typeof policyFormSchema>;
