import { z } from "zod";

export const MEASURE_KIND_OPTIONS = [
  { label: "Self-reported", value: "self_reported" },
  { label: "Measured", value: "measured" },
] as const;

export const scheduleOutcomeReviewSchema = z.object({
  kind: z.enum(["experiment", "outcome_review"]),
  title: z.string().trim().min(1, "Title is required").max(500),
  opportunityId: z.number().int().positive().optional(),
  goalId: z.number().int().positive().optional(),
  hypothesis: z.string().trim().max(5000).optional(),
  metric: z.string().trim().max(500).optional(),
  unit: z.string().trim().max(100).optional(),
  baseline: z.string().trim().optional(),
  target: z.string().trim().optional(),
  scheduledFor: z.union([z.iso.date(), z.literal("")]).optional(),
  measureKind: z.enum(["self_reported", "measured"]).optional(),
  metricPeriod: z.string().trim().max(200).optional(),
  sourceUrl: z.string().trim().url("Enter a valid URL").max(2000).optional().or(z.literal("")),
  measuredAt: z.union([z.iso.date(), z.literal("")]).optional(),
}).superRefine((values, ctx) => {
  if (values.measureKind !== "measured") return;
  if (!values.sourceUrl) {
    ctx.addIssue({ code: "custom", path: ["sourceUrl"], message: "Source URL is required for measured results" });
  }
  if (!values.measuredAt) {
    ctx.addIssue({ code: "custom", path: ["measuredAt"], message: "Measured date is required for measured results" });
  }
});

export type ScheduleOutcomeReviewValues = z.infer<typeof scheduleOutcomeReviewSchema>;
