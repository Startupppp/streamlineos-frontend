import { z } from "zod";

export const MEASURE_KIND_OPTIONS = [
  { label: "Self-reported", value: "self_reported" },
  { label: "Measured", value: "measured" },
] as const;

export const scheduleOutcomeReviewSchema = z.object({
  kind: z.enum(["experiment", "outcome_review"]),
  title: z.string().min(1, "Title is required").max(500),
  opportunityId: z.number().int().positive().optional(),
  goalId: z.number().int().positive().optional(),
  hypothesis: z.string().max(5000).optional(),
  metric: z.string().max(500).optional(),
  unit: z.string().max(100).optional(),
  baseline: z.string().optional(),
  target: z.string().optional(),
  scheduledFor: z.string().optional(),
  measureKind: z.enum(["self_reported", "measured"]).optional(),
  metricPeriod: z.string().max(200).optional(),
  sourceUrl: z.string().url("Enter a valid URL").max(2000).optional().or(z.literal("")),
});

export type ScheduleOutcomeReviewValues = z.infer<typeof scheduleOutcomeReviewSchema>;
