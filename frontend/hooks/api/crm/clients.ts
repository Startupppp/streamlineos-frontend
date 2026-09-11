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
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


import { lazyContract } from "@/lib/api-envelope";

const clientsListLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.clientAccountsListContract),
);
const clientDetailLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.clientAccountDetailContract),
);
const clientTimelineLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.clientTimelineContract),
);
const simpleClientsLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.simpleClientsListContract),
);
const clientOpportunitiesLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.clientOpportunitiesContract),
);
const onboardingItemsLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.onboardingItemsListContract),
);
const onboardingItemLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.onboardingItemContract),
);
export function useClientAccounts(filters?: ClientAccountFilters) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clients.list(filters as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedClientAccounts>("/clients", filters as Record<string, unknown>, signal, clientsListLazy),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useClientAccount(id: number) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clients.detail(id),
    queryFn: ({ signal }) => apiClient.get<ClientAccountWithActivities>(`/clients/${id}`, undefined, signal, clientDetailLazy),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useClientTimeline(clientId: number) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clients.timeline(clientId),
    queryFn: ({ signal }) => apiClient.get<{ events: ClientTimelineEvent[]; total: number }>(`/clients/${clientId}/timeline`, undefined, signal, clientTimelineLazy),
    staleTime: 2 * 60_000,
    enabled: clientId > 0,
  });
}

export function useSimpleClientsList() {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clients.simpleList(),
    queryFn: ({ signal }) => apiClient.get<SimpleClient[]>("/clients/list", undefined, signal, simpleClientsLazy),
    staleTime: 2 * 60_000,
  });
}

export function useClientOpportunities(clientId?: number) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clientOpportunities.list(clientId),
    queryFn: ({ signal }) =>
      apiClient.get<ClientOpportunity[]>(
        "/clients/opportunities",
        clientId ? { clientId } : undefined,
        signal,
        clientOpportunitiesLazy,
      ),
    staleTime: 2 * 60_000,
  });
}

export function useClientOnboardingItems(clientId: number) {
  return useGatedQuery("crm:clients:read", {
    queryKey: queryKeys.clientOnboarding.items(clientId),
    queryFn: ({ signal }) => apiClient.get<OnboardingItem[]>("/clients/onboarding/items", { clientId }, signal, onboardingItemsLazy),
    staleTime: 2 * 60_000,
    enabled: clientId > 0,
  });
}

export function useToggleOnboardingItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:clients:update", {
    mutationKey: ["clientOnboarding", "items", "toggle"] as const,
    mutationFn: ({ id, completed }: { id: number; completed: boolean; clientId: number }) =>
      apiClient.patch<OnboardingItem>(`/clients/onboarding/items/${id}`, {
        completedAt: completed ? new Date().toISOString() : null,
      }, undefined, onboardingItemLazy),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: queryKeys.clientOnboarding.items(vars.clientId) }),
  });
}
