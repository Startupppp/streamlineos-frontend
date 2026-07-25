"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  KbAnalyticsOverview,
  KbAnalyticsRange,
  KbNoResultRow,
  KbVerificationItem,
  KbPageAnalyticsRow,
  KbGapRow,
  KbContentGapRow,
} from "@/types/kb";

export function useKbAnalyticsOverview(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: queryKeys.kb.analyticsOverview(queryParams),
    queryFn: () => apiClient.get<KbAnalyticsOverview>("/kb/analytics/overview", queryParams),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKbNoResults(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: queryKeys.kb.noResults(queryParams),
    queryFn: () => apiClient.get<KbNoResultRow[]>("/kb/analytics/no-results", queryParams),
    staleTime: 5 * 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKbVerificationQueue() {
  const canManageVerification = useCan("kb:articles:manage");
  return useQuery({
    queryKey: queryKeys.kb.verificationQueue(),
    queryFn: () => apiClient.get<KbVerificationItem[]>("/kb/verification/queue"),
    staleTime: 60_000,
    enabled: canManageVerification,
  });
}

export function usePageAnalytics() {
  const canViewAnalytics = useCan("kb:analytics:view");
  return useQuery({
    queryKey: queryKeys.kb.pageAnalytics(),
    queryFn: () => apiClient.get<KbPageAnalyticsRow[]>("/kb/analytics/pages"),
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKnowledgeGaps(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: queryKeys.kb.knowledgeGaps(queryParams),
    queryFn: () => apiClient.get<KbGapRow[]>("/kb/analytics/gaps", queryParams),
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });
}

export function useKbContentGaps(range?: KbAnalyticsRange) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const queryParams: Record<string, unknown> = { ...range };
  return useQuery({
    queryKey: queryKeys.kb.contentGaps(queryParams),
    queryFn: () => apiClient.get<KbContentGapRow[]>("/kb/analytics/content-gaps", queryParams),
    staleTime: 60_000,
    enabled: canViewAnalytics,
  });
}
