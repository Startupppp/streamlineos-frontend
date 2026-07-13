"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  ClientAccountWithActivities,
  ClientActivity,
  ClientAccountFilters,
  PaginatedClientAccounts,
  LogClientActivityInput,
  ClientTimelineEvent,
  SimpleClient,
  ClientOpportunity,
  CreateClientOpportunityInput,
  OnboardingTemplate,
  OnboardingItem,
} from "@/types/crm";

export function useClientAccounts(filters?: ClientAccountFilters) {
  return useQuery({
    queryKey: queryKeys.clients.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedClientAccounts>("/clients", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useClientAccount(id: number) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => apiClient.get<ClientAccountWithActivities>(`/clients/${id}`),
    enabled: id > 0,
    staleTime: 2 * 60_000,
  });
}

export function useLogClientActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["clients", "activities", "create"] as const,
    mutationFn: (input: LogClientActivityInput) =>
      apiClient.post<ClientActivity>(
        `/clients/${input.clientAccountId}/activities`,
        input
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.clients.activities(vars.clientAccountId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.clients.detail(vars.clientAccountId),
      });
    },
  });
}

export function useClientTimeline(clientId: number) {
  return useQuery({
    queryKey: queryKeys.clients.timeline(clientId),
    queryFn: () => apiClient.get<{ events: ClientTimelineEvent[]; total: number }>(`/clients/${clientId}/timeline`),
    staleTime: 2 * 60_000,
    enabled: clientId > 0,
  });
}

export function useSimpleClientsList() {
  return useQuery({
    queryKey: queryKeys.clients.simpleList(),
    queryFn: () => apiClient.get<SimpleClient[]>("/clients/list"),
    staleTime: 2 * 60_000,
  });
}

export function useClientOpportunities(clientId?: number) {
  return useQuery({
    queryKey: queryKeys.clientOpportunities.list(clientId),
    queryFn: () =>
      apiClient.get<ClientOpportunity[]>(
        "/clients/opportunities",
        clientId ? { clientId } : undefined
      ),
    staleTime: 2 * 60_000,
  });
}

export function useCreateClientOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["clientOpportunities", "create"] as const,
    mutationFn: (input: CreateClientOpportunityInput) =>
      apiClient.post<ClientOpportunity>("/clients/opportunities", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clientOpportunities.all }),
  });
}

export function useUpdateClientOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["clientOpportunities", "update"] as const,
    mutationFn: ({ id, ...data }: Partial<CreateClientOpportunityInput> & { id: number }) =>
      apiClient.patch<ClientOpportunity>(`/clients/opportunities/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clientOpportunities.all }),
  });
}

export function useDeleteClientOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["clientOpportunities", "delete"] as const,
    mutationFn: (id: number) => apiClient.delete(`/clients/opportunities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clientOpportunities.all }),
  });
}

export function useOnboardingTemplates() {
  return useQuery({
    queryKey: queryKeys.clientOnboarding.templates(),
    queryFn: () => apiClient.get<OnboardingTemplate[]>("/clients/onboarding/templates"),
    staleTime: 2 * 60_000,
  });
}

export function useClientOnboardingItems(clientId: number) {
  return useQuery({
    queryKey: queryKeys.clientOnboarding.items(clientId),
    queryFn: () => apiClient.get<OnboardingItem[]>("/clients/onboarding/items", { clientId }),
    staleTime: 2 * 60_000,
    enabled: clientId > 0,
  });
}

export function useCreateOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["clientOnboarding", "items", "create"] as const,
    mutationFn: (input: {
      clientId: number; title: string; description?: string;
      assignedTo?: string; dueDate?: string; templateId?: number;
    }) => apiClient.post<OnboardingItem>("/clients/onboarding/items", input),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: queryKeys.clientOnboarding.items(vars.clientId) }),
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

export function useDeleteOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["clientOnboarding", "items", "delete"] as const,
    mutationFn: ({ id }: { id: number; clientId: number }) =>
      apiClient.delete(`/clients/onboarding/items/${id}`),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: queryKeys.clientOnboarding.items(vars.clientId) }),
  });
}

export function useCreateOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["clientOnboarding", "templates", "create"] as const,
    mutationFn: (input: { name: string; description?: string; isDefault?: boolean }) =>
      apiClient.post<OnboardingTemplate>("/clients/onboarding/templates", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clientOnboarding.templates() }),
  });
}
