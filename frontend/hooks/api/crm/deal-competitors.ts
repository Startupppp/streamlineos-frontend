"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
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

/**
 * CRM-P2-12. What the system noticed and nobody has ruled on yet.
 *
 * Gated on `crm:deals:read` — the same key as the deal's own timeline, which is
 * where the evidence comes from, so a proposal discloses nothing its reader
 * could not already open. Deciding is a separate key and a separate hook.
 */
export function useDealCompetitorSuggestions(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.dealCompetitorSuggestions.list(dealId, "pending"),
    queryFn: () =>
      apiClient.get<DealCompetitorSuggestion[]>(
        `/deals/${dealId}/competitor-suggestions?status=pending`,
      ),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

/**
 * Asks the server to read the deal's recent timeline and file what it
 * recognises.
 *
 * A mutation and not a query, because it writes proposal rows — and it is a
 * button rather than something the card does on mount, which is the frontend
 * half of "no autonomous deal open". A `useEffect` firing this on render would
 * make the product propose things nobody asked it to, which is the behaviour the
 * ticket exists to refuse.
 */
export function useScanDealCompetitorSuggestions(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
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

/**
 * Records that a named person agreed, and only then does a competitor exist.
 *
 * `confirmedCompetitorKey` is not ceremony: the server compares it against what
 * it stored and refuses a mismatch, so a card showing a stale proposal cannot
 * turn a click into a competitor its reader never saw. Both lists are
 * invalidated because exactly one row moves between them.
 */
export function useAcceptDealCompetitorSuggestion(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "competitorSuggestions", "accept", dealId] as const,
    mutationFn: ({
      suggestionId,
      ...body
    }: AcceptDealCompetitorSuggestionInput) =>
      apiClient.post<DealCompetitorSuggestion>(
        `/deals/${dealId}/competitor-suggestions/${suggestionId}/accept`,
        body,
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
  return useMutation({
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
