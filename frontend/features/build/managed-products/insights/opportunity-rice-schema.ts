import { z } from "zod";

export const riceFormSchema = z.object({
  reach: z
    .string()
    .trim()
    .min(1, "Reach is required")
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, "Reach must be 0 or greater"),
  reachPeriod: z.enum(["month", "quarter", "year"]),
  reachUnit: z.string().trim().max(100).optional(),
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
  expectedScoreVersion: z.number().int().min(0),
});

export type RiceFormValues = z.infer<typeof riceFormSchema>;

export const overrideFormSchema = z.object({
  overrideScore: z.number({ error: "Score is required" }).min(0, "Score must be 0 or greater"),
  reason: z
    .string()
    .trim()
    .min(3, "Reason must be at least 3 characters")
    .max(500, "Reason must be 500 characters or fewer"),
  expectedScoreVersion: z.number().int().min(0),
});

export type OverrideFormValues = z.infer<typeof overrideFormSchema>;

export const declineFormSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Add a reason for declining")
    .max(2000, "Keep the reason under 2000 characters"),
});

export type DeclineFormValues = z.infer<typeof declineFormSchema>;

const DECIMAL_PATTERN = /^-?\d{1,14}(\.\d+)?$/;

export const optionalDecimalField = z
  .string()
  .trim()
  .refine((value) => value === "" || DECIMAL_PATTERN.test(value), "Enter a number")
  .optional();

export const createOpportunityFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Keep under 200 characters"),
  problem: z.string().trim().max(5000).optional(),
  hypothesis: z.string().trim().max(5000).optional(),
  affectedSegment: z.string().trim().max(200).optional(),
  theme: z.string().trim().max(200).optional(),
  desiredOutcome: z.string().trim().max(2000).optional(),
  outcomeMetric: z.string().trim().max(500).optional(),
  outcomeUnit: z.string().trim().max(100).optional(),
  outcomeBaseline: optionalDecimalField,
  outcomeTarget: optionalDecimalField,
});

export type CreateOpportunityFormValues = z.infer<typeof createOpportunityFormSchema>;
