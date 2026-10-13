import { z } from "zod";

export const calendarCoachConsentContract = z.object({
  enabled: z.boolean(),
  version: z.number().int().nonnegative(),
  changedAt: z.string().nullable(),
});

export const calendarCoachInsightContract = z.object({
  consent: calendarCoachConsentContract,
  periodStart: z.string(),
  periodEnd: z.string(),
  coverage: z.enum(["complete", "partial", "unavailable", "disabled"]),
  meetingMinutes: z.number().int().nonnegative().nullable(),
  protectedWorkMinutes: z.number().int().nonnegative().nullable(),
  missedCommitments: z.number().int().nonnegative().nullable(),
  repeatedReschedules: z.number().int().nonnegative().nullable(),
  overdueTasks: z.number().int().nonnegative().nullable(),
  overdueBuildTickets: z.number().int().nonnegative().nullable(),
  recommendations: z.array(z.object({
    code: z.enum(["protect_work", "review_load", "review_overdue_tasks", "review_overdue_build", "restore_coverage"]),
    evidence: z.string(),
    proposal: z.string(),
  })),
  definitions: z.object({
    meetingMinutes: z.string(),
    protectedWorkMinutes: z.string(),
    missedCommitments: z.string(),
    repeatedReschedules: z.string(),
    overdueTasks: z.string(),
    overdueBuildTickets: z.string(),
  }),
});

export type CalendarCoachInsight = z.infer<typeof calendarCoachInsightContract>;
