"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type {
  DealCompetitor,
  CreateDealCompetitorInput,
  DealCompetitorSuggestion,
  DealCompetitorScanResult,
  AcceptDealCompetitorSuggestionInput,
  DismissDealCompetitorSuggestionInput,
} from "@/types/crm";

const dealCompetitorsListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealCompetitorsListContract));
const dealCompetitorLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealCompetitorContract));
const dealDeleteLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealDeleteContract));

export function useDealCompetitors(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.competitors(dealId),
    queryFn: ({ signal }) => apiClient.get<DealCompetitor[]>(`/deals/${dealId}/competitors`, undefined, signal, dealCompetitorsListLazy),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

export function useAddDealCompetitor(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "competitors", "create", dealId] as const,
    mutationFn: (input: CreateDealCompetitorInput) =>
      apiClient.post<DealCompetitor>(`/deals/${dealId}/competitors`, input, undefined, dealCompetitorLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.competitors(dealId) });
    },
  });
}

export function useDeleteDealCompetitor(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "competitors", "delete", dealId] as const,
    mutationFn: (competitorId: string) =>
      apiClient.delete<{ success: boolean }>(`/deals/${dealId}/competitors/${competitorId}`, undefined, undefined, dealDeleteLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.competitors(dealId) });
    },
  });
}

export function useDealCompetitorSuggestions(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.dealCompetitorSuggestions.list(dealId, "pending"),
    queryFn: ({ signal }) =>
      apiClient.get<DealCompetitorSuggestion[]>(
        `/deals/${dealId}/competitor-suggestions?status=pending`,
        undefined,
        signal,
      ),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

export function useScanDealCompetitorSuggestions(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "competitorSuggestions", "scan", dealId] as const,
    mutationFn: () =>
      apiClient.post<DealCompetitorScanResult>(
        `/deals/${dealId}/competitor-suggestions/scan`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.dealCompetitorSuggestions.all,
      });
    },
  });
}

export function useAcceptDealCompetitorSuggestion(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<
    DealCompetitorSuggestion,
    Error,
    AcceptDealCompetitorSuggestionInput
  >("crm:deals:update", {
    mutationKey: ["deals", "competitorSuggestions", "accept", dealId] as const,
    mutationFn: ({ suggestionId, ...body }, idempotencyKey) =>
      apiClient.post<DealCompetitorSuggestion>(
        `/deals/${dealId}/competitor-suggestions/${suggestionId}/accept`,
        body,
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.dealCompetitorSuggestions.all,
      });
      qc.invalidateQueries({ queryKey: queryKeys.deals.competitors(dealId) });
    },
  });
}

export function useDismissDealCompetitorSuggestion(dealId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:deals:update", {
    mutationKey: ["deals", "competitorSuggestions", "dismiss", dealId] as const,
    mutationFn: ({
      suggestionId,
      ...body
    }: DismissDealCompetitorSuggestionInput) =>
      apiClient.post<DealCompetitorSuggestion>(
        `/deals/${dealId}/competitor-suggestions/${suggestionId}/dismiss`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.dealCompetitorSuggestions.all,
      });
    },
  });
}
