import { z } from "zod";

export const rateFormSchema = z
  .object({
    projectId: z.string(),
    userId: z.string(),
    billingType: z.enum(["BILLABLE", "NON_BILLABLE", "FIXED"]),
    billRate: z
      .string()
      .regex(/^\d+(\.\d+)?$/, "Enter a valid non-negative number")
      .refine((v) => parseFloat(v) >= 0, "Must be non-negative"),
    costRate: z.string(),
    currency: z.string().min(1).max(10),
    priority: z.string(),
    effectiveFrom: z.string(),
    effectiveTo: z.string(),
  })
  .refine(
    (v) => !v.effectiveFrom || !v.effectiveTo || v.effectiveFrom <= v.effectiveTo,
    {
      message: "Effective from must be on or before effective to",
      path: ["effectiveTo"],
    },
  );

export type RateFormValues = z.infer<typeof rateFormSchema>;
