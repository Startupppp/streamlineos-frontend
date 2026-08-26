"use client";

import { useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  ClientAccountWithActivities,
  ClientAccountFilters,
  PaginatedClientAccounts,
  ClientTimelineEvent,
  SimpleClient,
  ClientOpportunity,
  OnboardingItem,
} from "@/types/crm";

export function useClientAccounts(filters?: ClientAccountFilters) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clients.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedClientAccounts>("/clients", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useClientAccount(id: number) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => apiClient.get<ClientAccountWithActivities>(`/clients/${id}`),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useClientTimeline(clientId: number) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clients.timeline(clientId),
    queryFn: () => apiClient.get<{ events: ClientTimelineEvent[]; total: number }>(`/clients/${clientId}/timeline`),
    staleTime: 2 * 60_000,
    enabled: clientId > 0,
  });
}

export function useSimpleClientsList() {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clients.simpleList(),
    queryFn: () => apiClient.get<SimpleClient[]>("/clients/list"),
    staleTime: 2 * 60_000,
  });
}

export function useClientOpportunities(clientId?: number) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clientOpportunities.list(clientId),
    queryFn: () =>
      apiClient.get<ClientOpportunity[]>(
        "/clients/opportunities",
        clientId ? { clientId } : undefined
      ),
    staleTime: 2 * 60_000,
  });
}

export function useClientOnboardingItems(clientId: number) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clientOnboarding.items(clientId),
    queryFn: () => apiClient.get<OnboardingItem[]>("/clients/onboarding/items", { clientId }),
    staleTime: 2 * 60_000,
    enabled: clientId > 0,
  });
}

export function useToggleOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["clientOnboarding", "items", "toggle"] as const,
    mutationFn: ({ id, completed }: { id: number; completed: boolean; clientId: number }) =>
      apiClient.patch<OnboardingItem>(`/clients/onboarding/items/${id}`, {
        completedAt: completed ? new Date().toISOString() : null,
      }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: queryKeys.clientOnboarding.items(vars.clientId) }),
  });
}
