"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  KbAnalyticsOverview,
  KbAnalyticsRange,
  KbNoResultRow,
  KbVerificationItem,
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

export function useKbVerificationQueue() {
  return useQuery({
    queryKey: queryKeys.kb.verificationQueue(),
    queryFn: () => apiClient.get<KbVerificationItem[]>("/kb/verification/queue"),
    staleTime: 60_000,
  });
}
