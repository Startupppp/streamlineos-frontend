"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import type {
  KbAnalyticsOverview,
  KbAnalyticsRange,
  KbNoResultRow,
  KbPageAnalyticsRow,
  KbGapRow,
  KbContentGapRow,
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
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.noResults(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbNoResultRow[]>("/kb/analytics/no-results", queryParams, signal, kbAnalyticsNoResultsContract),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export function usePageAnalytics() {
  const canViewAnalytics = useCan("kb:analytics:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageAnalytics(),
    queryFn: ({ signal }) => apiClient.get<KbPageAnalyticsRow[]>("/kb/analytics/pages", undefined, signal, kbAnalyticsPagesContract),
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKnowledgeGaps(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.knowledgeGaps(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbGapRow[]>("/kb/analytics/gaps", queryParams, signal, kbAnalyticsGapsContract),
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKbContentGaps(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...range };
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
