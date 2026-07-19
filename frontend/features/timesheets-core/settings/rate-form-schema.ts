import { z } from "zod";

export const rateFormSchema = z.object({
  projectId: z.string(),
  userId: z.string(),
  billingType: z.enum(["BILLABLE", "NON_BILLABLE", "INTERNAL"]),
  billRate: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Enter a valid non-negative number")
    .refine((v) => parseFloat(v) >= 0, "Must be non-negative"),
  costRate: z.string(),
  currency: z.string().min(1).max(10),
  priority: z.string(),
});

export type RateFormValues = z.infer<typeof rateFormSchema>;
