"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
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
  const canRead = useCan("crm:clients:read");
  return useQuery({
    queryKey: queryKeys.clients.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedClientAccounts>("/clients", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canRead,
  });
}

export function useClientAccount(id: number) {
  const canRead = useCan("crm:clients:read");
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => apiClient.get<ClientAccountWithActivities>(`/clients/${id}`),
    staleTime: 2 * 60_000,
    enabled: canRead && id > 0,
  });
}

export function useClientTimeline(clientId: number) {
  const canRead = useCan("crm:clients:read");
  return useQuery({
    queryKey: queryKeys.clients.timeline(clientId),
    queryFn: () => apiClient.get<{ events: ClientTimelineEvent[]; total: number }>(`/clients/${clientId}/timeline`),
    staleTime: 2 * 60_000,
    enabled: canRead && clientId > 0,
  });
}

export function useSimpleClientsList() {
  const canRead = useCan("crm:clients:read");
  return useQuery({
    queryKey: queryKeys.clients.simpleList(),
    queryFn: () => apiClient.get<SimpleClient[]>("/clients/list"),
    staleTime: 2 * 60_000,
    enabled: canRead,
  });
}

export function useClientOpportunities(clientId?: number) {
  const canRead = useCan("crm:clients:read");
  return useQuery({
    queryKey: queryKeys.clientOpportunities.list(clientId),
    queryFn: () =>
      apiClient.get<ClientOpportunity[]>(
        "/clients/opportunities",
        clientId ? { clientId } : undefined
      ),
    staleTime: 2 * 60_000,
    enabled: canRead,
  });
}

export function useClientOnboardingItems(clientId: number) {
  const canRead = useCan("crm:clients:read");
  return useQuery({
    queryKey: queryKeys.clientOnboarding.items(clientId),
    queryFn: () => apiClient.get<OnboardingItem[]>("/clients/onboarding/items", { clientId }),
    staleTime: 2 * 60_000,
    enabled: canRead && clientId > 0,
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
