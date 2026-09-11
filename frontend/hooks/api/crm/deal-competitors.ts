"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { DealCompetitor, CreateDealCompetitorInput } from "@/types/crm";

export function useDealCompetitors(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.competitors(dealId),
    queryFn: () => apiClient.get<DealCompetitor[]>(`/deals/${dealId}/competitors`),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

export function useAddDealCompetitor(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "competitors", "create", dealId] as const,
    mutationFn: (input: CreateDealCompetitorInput) =>
      apiClient.post<DealCompetitor>(`/deals/${dealId}/competitors`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.competitors(dealId) });
    },
  });
}

export function useDeleteDealCompetitor(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "competitors", "delete", dealId] as const,
    mutationFn: (competitorId: string) =>
      apiClient.delete<{ success: boolean }>(`/deals/${dealId}/competitors/${competitorId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.competitors(dealId) });
    },
  });
}
