import { z } from "zod";

export const kbAnalyticsOverviewContract = z.object({
  totalViews: z.number().int(),
  uniqueVisitors: z.number().int(),
  avgRating: z.number().nullable(),
  totalSearches: z.number().int(),
  noResultsRate: z.number(),
  topArticles: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      views: z.number().int(),
      helpfulRatio: z.number().nullable(),
    }),
  ),
  viewTrend: z.array(
    z.object({ date: z.string(), views: z.number().int() }),
  ),
});

export const kbAnalyticsNoResultsContract = z.array(
  z.object({
    query: z.string(),
    count: z.number().int(),
    lastSearchedAt: z.string(),
  }),
);

export const kbAnalyticsPagesContract = z.array(
  z.object({
    id: z.number().int(),
    title: z.string(),
    views: z.number().int(),
    uniqueVisitors: z.number().int(),
    avgTimeOnPage: z.number().nullable(),
  }),
);

export const kbAnalyticsGapsContract = z.array(
  z.object({
    query: z.string(),
    count: z.number().int(),
    suggestion: z.string().nullable(),
  }),
);

export const kbAnalyticsContentGapsContract = z.object({
  gaps: z.array(
    z.object({
      topic: z.string(),
      searchVolume: z.number().int(),
      coverageScore: z.number(),
    }),
  ),
  recommendations: z.array(z.string()),
});
