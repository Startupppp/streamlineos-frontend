"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  KbAnalyticsOverview,
  KbAnalyticsRange,
  KbNoResultRow,
  KbPageAnalyticsRow,
  KbGapRow,
  KbContentGapRow,
} from "@/types/kb";

export function useKbAnalyticsOverview(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: queryKeys.kb.analyticsOverview(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbAnalyticsOverview>("/kb/analytics/overview", queryParams, signal),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKbNoResults(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: queryKeys.kb.noResults(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbNoResultRow[]>("/kb/analytics/no-results", queryParams, signal),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export function usePageAnalytics() {
  const canViewAnalytics = useCan("kb:analytics:view");
  return useQuery({
    queryKey: queryKeys.kb.pageAnalytics(),
    queryFn: ({ signal }) => apiClient.get<KbPageAnalyticsRow[]>("/kb/analytics/pages", undefined, signal),
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKnowledgeGaps(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: queryKeys.kb.knowledgeGaps(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbGapRow[]>("/kb/analytics/gaps", queryParams, signal),
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKbContentGaps(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: queryKeys.kb.contentGaps(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbContentGapRow[]>("/kb/analytics/content-gaps", queryParams, signal),
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });
}
