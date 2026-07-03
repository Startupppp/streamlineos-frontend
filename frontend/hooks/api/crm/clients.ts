"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  ClientAccount,
  ClientAccountWithActivities,
  ClientActivity,
  ClientAccountFilters,
  PaginatedClientAccounts,
  LogClientActivityInput,
  CrmAssignmentStats,
  UpdateRenewalInput,
  ClientTimelineEvent,
  SimpleClient,
  ClientOpportunity,
  CreateClientOpportunityInput,
  OnboardingTemplate,
  OnboardingItem,
  CsatSurvey,
  CsatResponse,
  SlaStats,
} from "@/types/crm";

export type {
  CrmAssignmentStats,
  UpdateRenewalInput,
  ClientTimelineEvent,
  ClientOpportunity,
  CreateClientOpportunityInput,
  CsatSurvey,
  CsatResponse,
};

export function useClientAccounts(filters?: ClientAccountFilters) {
  return useQuery({
    queryKey: queryKeys.clients.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedClientAccounts>("/clients", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
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

export function useCrmAssignmentStats(enabled = false) {
  return useQuery({
    queryKey: queryKeys.clients.crmStats(),
    queryFn: () => apiClient.get<CrmAssignmentStats>("/clients/assign-crm"),
    staleTime: 2 * 60_000,
    enabled,
  });
}

export function useAssignCrmReps() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["clients", "assignCrm"] as const,
    mutationFn: () =>
      apiClient.post<CrmAssignmentStats>("/clients/assign-crm", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      qc.invalidateQueries({ queryKey: queryKeys.clients.crmStats() });
    },
  });
}

export function useRenewalAccounts() {
  return useQuery({
    queryKey: [...queryKeys.clients.all, "renewals"] as const,
    queryFn: () => apiClient.get<ClientAccount[]>("/clients/renewals"),
    staleTime: 2 * 60_000,
  });
}

export function useUpdateRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["clients", "renewals", "update"] as const,
    mutationFn: ({ accountId, ...data }: UpdateRenewalInput) =>
      apiClient.patch<ClientAccount>(`/clients/renewals/${accountId}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...queryKeys.clients.all, "renewals"] });
      qc.invalidateQueries({ queryKey: queryKeys.clients.detail(vars.accountId) });
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      qc.invalidateQueries({ queryKey: queryKeys.clientStats.stats() });
    },
  });
}

export function useClientTimeline(clientId: number) {
  return useQuery({
    queryKey: [...queryKeys.clients.detail(clientId), "timeline"] as const,
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

export function useCsatSurveys() {
  return useQuery({
    queryKey: queryKeys.csat.surveys(),
    queryFn: () => apiClient.get<CsatSurvey[]>("/csat"),
    staleTime: 2 * 60_000,
  });
}

export function useCsatSurveyResponses(surveyId: number) {
  return useQuery({
    queryKey: queryKeys.csat.responses(surveyId),
    queryFn: () => apiClient.get<CsatResponse[]>(`/csat/${surveyId}/responses`),
    staleTime: 2 * 60_000,
    enabled: surveyId > 0,
  });
}

export function useCreateCsatSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["csat", "create"] as const,
    mutationFn: (input: { title: string; question?: string; clientId?: number; scaleMax?: number }) =>
      apiClient.post<CsatSurvey>("/csat", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.csat.all }),
  });
}

export function useUpdateCsatSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["csat", "update"] as const,
    mutationFn: ({ id, ...data }: { id: number; status?: string; title?: string; question?: string }) =>
      apiClient.patch<CsatSurvey>(`/csat/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.csat.all }),
  });
}

export function useDeleteCsatSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["csat", "delete"] as const,
    mutationFn: (id: number) => apiClient.delete(`/csat/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.csat.all }),
  });
}

export function useSlaCompliance() {
  return useQuery({
    queryKey: queryKeys.sla.compliance(),
    queryFn: () => apiClient.get<SlaStats>("/customer-executive/sla"),
    staleTime: 5 * 60 * 1000,
  });
}
