import { z } from "zod";

export const kbAnalyticsOverviewContract = z.object({
  totalCount: z.number().int(),
  publishedCount: z.number().int(),
  archivedCount: z.number().int(),
  totalViews: z.number().int(),
  helpfulUp: z.number().int(),
  helpfulDown: z.number().int(),
  helpfulRatio: z.number(),
  searches: z.number().int(),
  noResults: z.number().int(),
  searchSuccessRate: z.number(),
  aiAnswers: z.number().int(),
  aiNoContext: z.number().int(),
  views: z.number().int(),
  ticketsDeflected: z.number().int(),
  verifiedPublished: z.number().int(),
  trustScore: z.number(),
  topArticles: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      slug: z.string(),
      spaceId: z.number().int().nullable(),
      viewCount: z.number().int(),
      helpfulCount: z.number().int(),
      notHelpfulCount: z.number().int(),
    }),
  ),
});

export const kbAnalyticsNoResultsContract = z.array(
  z.object({
    query: z.string().nullable(),
    count: z.number().int(),
  }),
);

export const kbAnalyticsPagesContract = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      status: z.enum(["draft", "in_review", "published", "archived"]),
      trustState: z.enum(["unverified", "verified", "verification_expired"]),
      updatedAt: z.string(),
      uniqueViewers: z.number().int(),
      commentCount: z.number().int(),
      versionCount: z.number().int(),
    }),
  ),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const kbAnalyticsGapsContract = z.array(
  z.object({
    query: z.string().nullable(),
    count: z.number().int(),
    lastOccurredAt: z.string(),
  }),
);

export const kbAnalyticsContentGapsContract = z.array(
  z.object({
    query: z.string().nullable(),
    count: z.number().int(),
    lastOccurredAt: z.string(),
    gapKind: z.enum(["search", "ai_no_context"]),
  }),
);

export const kbAnalyticsCitationReuseContract = z.array(
  z.object({
    kind: z.string(),
    refId: z.number().int(),
    title: z.string(),
    reuseCount: z.number().int(),
  }),
);

export const kbAnalyticsReviewSlaContract = z.object({
  decided: z.number().int(),
  metSla: z.number().int(),
  slaRate: z.number(),
  overdueOpen: z.number().int(),
});
