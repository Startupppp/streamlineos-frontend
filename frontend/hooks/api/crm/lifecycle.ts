"use client";

import { useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  CustomerHealthRosterParams,
  CustomerHealthRosterResponse,
  ListLifecyclesParams,
  ListLifecyclesResponse,
} from "@/types/crm/lifecycle";

function cleanParams<T extends object>(params?: T) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ""),
  );
}

export function useCustomerLifecycles(params?: ListLifecyclesParams) {
  const query = cleanParams(params);
  return useGatedQuery("crm:lifecycle:view", {
    queryKey: queryKeys.crmLifecycle.list(query),
    queryFn: () => apiClient.get<ListLifecyclesResponse>("/crm/lifecycles", query),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCustomerHealthRoster(params?: CustomerHealthRosterParams) {
  const query = cleanParams(params);
  return useGatedQuery("crm:customer-health:view", {
    queryKey: queryKeys.crmLifecycle.healthRoster(query),
    queryFn: () => apiClient.get<CustomerHealthRosterResponse>("/crm/customer-health", query),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useRecomputeCustomerHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "customer-health", "recompute"],
    mutationFn: (partyId: string) =>
      apiClient.post<{ data: unknown }>(`/crm/customer-health/${partyId}/recompute`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmLifecycle.all });
    },
  });
}
