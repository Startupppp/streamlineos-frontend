import { z } from "zod";

export const scheduleOutcomeReviewSchema = z.object({
  kind: z.enum(["experiment", "outcome_review"]),
  title: z.string().min(1, "Title is required").max(500),
  hypothesis: z.string().max(5000).optional(),
  metric: z.string().max(500).optional(),
  unit: z.string().max(100).optional(),
  baseline: z.string().optional(),
  target: z.string().optional(),
  scheduledFor: z.string().optional(),
});

export type ScheduleOutcomeReviewValues = z.infer<typeof scheduleOutcomeReviewSchema>;
