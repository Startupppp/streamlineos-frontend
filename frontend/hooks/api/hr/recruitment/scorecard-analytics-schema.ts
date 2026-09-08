import { z } from "zod";

export const interviewerStatContract = z.object({
  interviewerId: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  totalScorecards: z.number(),
  avgRating: z.number(),
  recommendations: z.record(z.string(), z.number()),
  hireRate: z.number(),
  hiresAfterPositive: z.number(),
  positiveScorecards: z.number(),
});

export const scorecardAnalyticsContract = z.object({
  interviewerStats: z.array(interviewerStatContract),
  orgAvgRating: z.number(),
  totalScorecards: z.number(),
  scoreDistribution: z.array(z.object({ range: z.string(), count: z.number() })),
  period: z.object({ days: z.number(), since: z.string() }),
});
