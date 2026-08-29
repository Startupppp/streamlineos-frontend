import { z } from "zod";

export const SAMPLING_METHODS = ["ALL", "PERCENTAGE", "FIXED_QUANTITY"] as const;

export const SAMPLING_METHOD_LABEL: Record<(typeof SAMPLING_METHODS)[number], string> = {
  ALL: "Inspect every unit",
  PERCENTAGE: "Inspect a percentage",
  FIXED_QUANTITY: "Inspect a fixed quantity",
};

export const PLAN_SCOPES = ["ALL", "CATEGORY", "PRODUCT_VARIANT"] as const;

export const PLAN_SCOPE_LABEL: Record<(typeof PLAN_SCOPES)[number], string> = {
  ALL: "Every product",
  CATEGORY: "A category",
  PRODUCT_VARIANT: "One variant",
};

/**
 * Mirrors the backend's `createInspectionPlanSchema` exactly, including the
 * cross-field rules — a sample size means a different thing under each method
 * and nothing at all under ALL, so a per-field `optional()` would let "inspect
 * everything, twelve of them" reach the API and come back a 400.
 */
export const inspectionPlanFormSchema = z
  .object({
    code: z
      .string()
      .min(1, "A code is required")
      .max(40)
      .regex(/^[A-Z0-9][A-Z0-9_-]*$/, "Uppercase letters, digits, hyphen and underscore only"),
    name: z.string().min(1, "A name is required").max(160),
    description: z.string().max(2000).optional(),
    scope: z.enum(PLAN_SCOPES),
    categoryId: z.string().optional(),
    productVariantId: z.string().optional(),
    appliesOnReceipt: z.boolean(),
    appliesOnReturn: z.boolean(),
    samplingMethod: z.enum(SAMPLING_METHODS),
    sampleValue: z.string().optional(),
    instructions: z.string().max(2000).optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.appliesOnReceipt && !values.appliesOnReturn) {
      ctx.addIssue({
        code: "custom",
        path: ["appliesOnReceipt"],
        message: "A plan that applies to nothing would never be consulted",
      });
    }
    if (values.scope === "CATEGORY" && !values.categoryId) {
      ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Choose a category" });
    }
    if (values.scope === "PRODUCT_VARIANT" && !values.productVariantId) {
      ctx.addIssue({ code: "custom", path: ["productVariantId"], message: "Choose a variant" });
    }
    if (values.samplingMethod === "ALL") return;
    const raw = values.sampleValue?.trim();
    if (!raw) {
      ctx.addIssue({ code: "custom", path: ["sampleValue"], message: "A sample size is required" });
      return;
    }
    if (!/^\d+(\.\d+)?$/.test(raw)) {
      ctx.addIssue({ code: "custom", path: ["sampleValue"], message: "Enter a positive number" });
      return;
    }
    const value = Number(raw);
    if (value <= 0) {
      ctx.addIssue({ code: "custom", path: ["sampleValue"], message: "Must be greater than zero" });
      return;
    }
    if (values.samplingMethod === "PERCENTAGE" && value > 100) {
      ctx.addIssue({ code: "custom", path: ["sampleValue"], message: "A percentage cannot exceed 100" });
    }
  });

export type InspectionPlanFormValues = z.infer<typeof inspectionPlanFormSchema>;

export const planVersionFormSchema = z
  .object({
    samplingMethod: z.enum(SAMPLING_METHODS),
    sampleValue: z.string().optional(),
    instructions: z.string().max(2000).optional(),
    activate: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.samplingMethod === "ALL") return;
    const raw = values.sampleValue?.trim();
    if (!raw || !/^\d+(\.\d+)?$/.test(raw) || Number(raw) <= 0) {
      ctx.addIssue({ code: "custom", path: ["sampleValue"], message: "Enter a positive number" });
      return;
    }
    if (values.samplingMethod === "PERCENTAGE" && Number(raw) > 100) {
      ctx.addIssue({ code: "custom", path: ["sampleValue"], message: "A percentage cannot exceed 100" });
    }
  });

export type PlanVersionFormValues = z.infer<typeof planVersionFormSchema>;
