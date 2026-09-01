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
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedClientAccounts>("/clients", filters as Record<string, unknown>, signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useClientAccount(id: number) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clients.detail(id),
    queryFn: ({ signal }) => apiClient.get<ClientAccountWithActivities>(`/clients/${id}`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useClientTimeline(clientId: number) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clients.timeline(clientId),
    queryFn: ({ signal }) => apiClient.get<{ events: ClientTimelineEvent[]; total: number }>(`/clients/${clientId}/timeline`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: clientId > 0,
  });
}

export function useSimpleClientsList() {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clients.simpleList(),
    queryFn: ({ signal }) => apiClient.get<SimpleClient[]>("/clients/list", undefined, signal),
    staleTime: 2 * 60_000,
  });
}

export function useClientOpportunities(clientId?: number) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clientOpportunities.list(clientId),
    queryFn: ({ signal }) =>
      apiClient.get<ClientOpportunity[]>(
        "/clients/opportunities",
        clientId ? { clientId } : undefined
      , signal),
    staleTime: 2 * 60_000,
  });
}

export function useClientOnboardingItems(clientId: number) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clientOnboarding.items(clientId),
    queryFn: ({ signal }) => apiClient.get<OnboardingItem[]>("/clients/onboarding/items", { clientId }, signal),
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
