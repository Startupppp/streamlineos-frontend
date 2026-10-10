import { z } from "zod";

export const riceFormSchema = z.object({
  reach: z.string().min(1, "Reach is required"),
  reachPeriod: z.enum(["month", "quarter", "year"]),
  reachUnit: z.string().optional(),
  impact: z.number({ error: "Impact is required" }).refine(
    (v) => [0.25, 0.5, 1, 2, 3].includes(v),
    "Select a valid impact level",
  ),
  confidence: z
    .number({ error: "Confidence is required" })
    .min(0)
    .max(1),
  effort: z
    .number({ error: "Effort is required" })
    .positive("Effort must be greater than 0"),
  effortUnit: z.enum(["person_days", "person_weeks", "person_months"]),
  expectedScoreVersion: z.number().int(),
});

export type RiceFormValues = z.infer<typeof riceFormSchema>;

export const overrideFormSchema = z.object({
  overrideScore: z.number({ error: "Score is required" }),
  reason: z
    .string()
    .min(1, "Reason is required")
    .refine((s) => s.trim().length > 0, "Reason cannot be blank"),
  expectedScoreVersion: z.number().int(),
});

export type OverrideFormValues = z.infer<typeof overrideFormSchema>;
