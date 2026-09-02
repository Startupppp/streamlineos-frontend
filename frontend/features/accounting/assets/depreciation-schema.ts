import { z } from "zod";

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

export const runDepreciationSchema = z.object({
  periodKey: z
    .string()
    .min(1, "Period is required")
    .regex(PERIOD_PATTERN, "Must be in YYYY-MM format (e.g. 2025-01)"),
});

export type RunFormValues = z.infer<typeof runDepreciationSchema>;
