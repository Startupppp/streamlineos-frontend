"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type {
  KbAnalyticsOverview,
  KbAnalyticsRange,
  KbNoResultRow,
  KbPageAnalyticsRow,
  KbGapRow,
  KbContentGapRow,
  KbCitationReuseRow,
  KbReviewSla,
} from "@/types/kb";

const kbAnalyticsOverviewContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsOverviewContract),
);

const kbAnalyticsNoResultsContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsNoResultsContract),
);

const kbAnalyticsPagesContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsPagesContract),
);

const kbAnalyticsGapsContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsGapsContract),
);

const kbAnalyticsContentGapsContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsContentGapsContract),
);

const kbAnalyticsCitationReuseContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsCitationReuseContract),
);

const kbAnalyticsReviewSlaContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-analytics-schema").then((m) => m.kbAnalyticsReviewSlaContract),
);

export function useKbAnalyticsOverview(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.analyticsOverview(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbAnalyticsOverview>("/kb/analytics/overview", queryParams, signal, kbAnalyticsOverviewContract),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKbNoResults(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { from: range?.from, to: range?.to };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.noResults(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbNoResultRow[]>("/kb/analytics/no-results", queryParams, signal, kbAnalyticsNoResultsContract),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export interface PageAnalyticsPage {
  data: KbPageAnalyticsRow[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface PageAnalyticsFilters {
  spaceId?: number;
  staleOnly?: boolean;
}

export function usePageAnalytics(filters?: PageAnalyticsFilters) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const { spaceId, staleOnly } = filters ?? {};
  const keyParams: Record<string, unknown> = {
    ...(spaceId !== undefined ? { spaceId } : {}),
    ...(staleOnly === true ? { staleOnly: true } : {}),
  };
  const query = useInfiniteQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageAnalytics(
      Object.keys(keyParams).length > 0 ? keyParams : undefined,
    ),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) => {
      const params: Record<string, unknown> = {
        ...(pageParam !== undefined ? { cursor: pageParam } : {}),
        ...(spaceId !== undefined ? { spaceId } : {}),
        ...(staleOnly === true ? { staleOnly: "1" } : {}),
      };
      return apiClient.get<PageAnalyticsPage>(
        "/kb/analytics/pages",
        Object.keys(params).length > 0 ? params : undefined,
        signal,
        kbAnalyticsPagesContract,
      );
    },
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });

  return {
    ...query,
    data: query.data?.pages.flatMap((page) => page.data),
  };
}

export function useCitationReuse(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { from: range?.from, to: range?.to };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.citationReuse(queryParams),
    queryFn: ({ signal }) =>
      apiClient.get<KbCitationReuseRow[]>("/kb/analytics/citation-reuse", queryParams, signal, kbAnalyticsCitationReuseContract),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export function useReviewSla(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { from: range?.from, to: range?.to };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.reviewSla(queryParams),
    queryFn: ({ signal }) =>
      apiClient.get<KbReviewSla>("/kb/analytics/review-sla", queryParams, signal, kbAnalyticsReviewSlaContract),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKnowledgeGaps(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { from: range?.from, to: range?.to };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.knowledgeGaps(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbGapRow[]>("/kb/analytics/gaps", queryParams, signal, kbAnalyticsGapsContract),
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKbContentGaps(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { from: range?.from, to: range?.to };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.contentGaps(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbContentGapRow[]>("/kb/analytics/content-gaps", queryParams, signal, kbAnalyticsContentGapsContract),
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });
}

const wikiPageStatsContract = lazyContract(() =>
  import("@/hooks/api/kb/analytics-schema").then((m) => m.wikiPageStatsContract),
);

const wikiStalePagesContract = lazyContract(() =>
  import("@/hooks/api/kb/analytics-schema").then((m) => m.wikiStalePagesContract),
);

const wikiContributorsContract = lazyContract(() =>
  import("@/hooks/api/kb/analytics-schema").then((m) => m.wikiContributorsContract),
);

export interface WikiAnalyticsParams {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
  spaceId?: number;
}

export function useWikiPageStats(params?: WikiAnalyticsParams) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: ["knowledge", "kb", "wikiPageStats", queryParams] as const,
    queryFn: ({ signal }) =>
      apiClient.get("/kb/wiki/analytics/page-stats", queryParams, signal, wikiPageStatsContract),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export function useWikiStalePages(params?: WikiAnalyticsParams) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: ["knowledge", "kb", "wikiStalePages", queryParams] as const,
    queryFn: ({ signal }) =>
      apiClient.get("/kb/wiki/analytics/stale-pages", queryParams, signal, wikiStalePagesContract),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export function useWikiContributors(params?: WikiAnalyticsParams) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: ["knowledge", "kb", "wikiContributors", queryParams] as const,
    queryFn: ({ signal }) =>
      apiClient.get("/kb/wiki/analytics/contributors", queryParams, signal, wikiContributorsContract),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}
