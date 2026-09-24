import { z } from "zod";

/**
 * Conversion over a period, as distinct from the pipeline right now.
 *
 * Every rate is nullable and that is the contract's point: `null` means "there
 * was nobody to convert", `0` means "people arrived and none converted". A
 * client that coalesced the first to zero would tell a recruiter their
 * screening is broken when they simply have no applicants.
 */
export const recruitingAnalyticsContract = z.object({
  window: z.object({ from: z.coerce.date(), to: z.coerce.date() }),
  funnel: z.array(
    z.object({
      stage: z.string(),
      count: z.number().int(),
      conversionFromPrevious: z.number().nullable(),
      conversionFromTop: z.number().nullable(),
    }),
  ),
  timeToFillDays: z.object({
    count: z.number().int(),
    median: z.number().nullable(),
    p90: z.number().nullable(),
    mean: z.number().nullable(),
  }),
  sources: z.array(
    z.object({
      source: z.string(),
      applicants: z.number().int(),
      hires: z.number().int(),
      hireRate: z.number().nullable(),
    }),
  ),
  interviewerLoad: z.array(
    z.object({
      membershipId: z.number().int(),
      name: z.string(),
      scheduled: z.number().int(),
      completed: z.number().int(),
    }),
  ),
  offers: z.object({
    accepted: z.number().int(),
    declined: z.number().int(),
    outstanding: z.number().int(),
    acceptRate: z.number().nullable(),
  }),
  /** True when the window produced no rows at all. */
  empty: z.boolean(),
});

export type RecruitingAnalytics = z.infer<typeof recruitingAnalyticsContract>;
