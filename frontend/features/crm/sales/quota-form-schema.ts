import { z } from "zod";

/** Mirrors the backend `quotaCreateSchema`, including its start-before-end refinement. */
export const quotaFormSchema = z
  .object({
    userId: z.string().min(1, "Choose a rep"),
    period: z.enum(["monthly", "quarterly", "yearly"]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    targetRevenue: z
      .string()
      .min(1, "Target revenue is required")
      .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, "Target revenue must be a positive number"),
    notes: z.string().max(2000),
  })
  .refine((data) => data.startDate < data.endDate, { message: "Start date must be before end date", path: ["endDate"] });

export type QuotaFormValues = z.infer<typeof quotaFormSchema>;

export const QUOTA_DEFAULTS: QuotaFormValues = {
  userId: "",
  period: "monthly",
  startDate: "",
  endDate: "",
  targetRevenue: "",
  notes: "",
};

export const QUOTA_PERIOD_LABELS: Record<QuotaFormValues["period"], string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};
