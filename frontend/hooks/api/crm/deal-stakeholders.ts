"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { DealStakeholder, CreateStakeholderInput } from "@/types/crm";

export function useStakeholders(dealId: number) {
  return useGatedQuery("crm:deals:read", {
    queryKey: queryKeys.deals.stakeholders(dealId),
    queryFn: () => apiClient.get<DealStakeholder[]>(`/deals/${dealId}/stakeholders`),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

export function useCreateStakeholder(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "stakeholders", "create", dealId] as const,
    mutationFn: (input: CreateStakeholderInput) =>
      apiClient.post<DealStakeholder>(`/deals/${dealId}/stakeholders`, input),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.deals.stakeholders(dealId) });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.stakeholders(dealId) });
    },
  });
}

export function useDeleteStakeholder(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["deals", "stakeholders", "delete", dealId] as const,
    mutationFn: (stakeholderId: string) =>
      apiClient.delete<{ deleted: boolean }>(`/deals/${dealId}/stakeholders/${stakeholderId}`),
    onMutate: async (stakeholderId) => {
      await qc.cancelQueries({ queryKey: queryKeys.deals.stakeholders(dealId) });
      const snapshot = qc.getQueryData<DealStakeholder[]>(queryKeys.deals.stakeholders(dealId));
      qc.setQueryData<DealStakeholder[]>(queryKeys.deals.stakeholders(dealId), (old) =>
        old ? old.filter((s) => s.id !== stakeholderId) : old,
      );
      return { snapshot };
    },
    onError: (_, _vars, context) => {
      if (context?.snapshot) {
        qc.setQueryData(queryKeys.deals.stakeholders(dealId), context.snapshot);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.stakeholders(dealId) });
    },
  });
}
