"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  KbAnalyticsOverview,
  KbAnalyticsRange,
  KbNoResultRow,
  KbPageAnalyticsRow,
  KbGapRow,
} from "@/types/kb";

export function useKbAnalyticsOverview(range?: KbAnalyticsRange) {
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: queryKeys.kb.analyticsOverview(queryParams),
    queryFn: () => apiClient.get<KbAnalyticsOverview>("/kb/analytics/overview", queryParams),
    staleTime: 5 * 60_000,
  });
}

export function useKbNoResults(range?: KbAnalyticsRange) {
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: queryKeys.kb.noResults(queryParams),
    queryFn: () => apiClient.get<KbNoResultRow[]>("/kb/analytics/no-results", queryParams),
    staleTime: 5 * 60_000,
  });
}

export function usePageAnalytics() {
  return useQuery({
    queryKey: queryKeys.kb.pageAnalytics(),
    queryFn: () => apiClient.get<KbPageAnalyticsRow[]>("/kb/analytics/pages"),
    staleTime: 60_000,
  });
}

export function useKnowledgeGaps(range?: KbAnalyticsRange) {
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: queryKeys.kb.knowledgeGaps(queryParams),
    queryFn: () => apiClient.get<KbGapRow[]>("/kb/analytics/gaps", queryParams),
    staleTime: 60_000,
  });
}
