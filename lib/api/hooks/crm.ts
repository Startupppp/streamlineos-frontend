"use client";

/**
 * TanStack Query hooks for the CRM domain.
 * Covers Deals, Contacts, Client Accounts, Targets, and CRM dashboards.
 * Uses apiClient (Axios) — zero tRPC imports.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Deal,
  DealActivity,
  DealFilters,
  CreateDealInput,
  UpdateDealInput,
  UpdateDealStageInput,
  LogDealActivityInput,
  Contact,
  PaginatedContacts,
  ContactFilters,
  CreateContactInput,
  UpdateContactInput,
  ClientAccount,
  ClientAccountWithActivities,
  ClientActivity,
  ClientAccountFilters,
  PaginatedClientAccounts,
  UpdateClientAccountStatusInput,
  LogClientActivityInput,
  ClientAccountStats,
  Target,
  TargetHistory,
  TargetFilters,
  TargetLeaderboardEntry,
  CreateTargetInput,
  UpdateTargetInput,
  LogTargetProgressInput,
  SalesDashboard,
  MarketingDashboard,
  SupportDashboard,
  CustomerExecutiveDashboard,
  CrmPersonProfile,
  CrmOrganization,
  CrmOrganizationFilters,
  PaginatedCrmOrganizations,
  CreateCrmOrganizationInput,
} from "@/types/crm";

// ─── Deals ───────────────────────────────────────────────────────────────────

export function useDeals(filters?: DealFilters) {
  return useQuery({
    queryKey: queryKeys.deals.list(filters as Record<string, unknown>),
    queryFn: () => apiClient.get<Deal[]>("/deals", filters as Record<string, unknown>),
  });
}

export function useDealDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.deals.detail(id),
    queryFn: () => apiClient.get<Deal>(`/deals/${id}`),
    enabled: id > 0,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDealInput) => apiClient.post<Deal>("/deals", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateDealInput) =>
      apiClient.patch<Deal>(`/deals/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.id) });
    },
  });
}

export function useUpdateDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: UpdateDealStageInput) =>
      apiClient.patch<Deal>(`/deals/${id}`, { stage }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.id) });
    },
  });
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export function useContacts(filters?: ContactFilters) {
  return useQuery({
    queryKey: queryKeys.contacts.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedContacts>("/contacts", filters as Record<string, unknown>),
  });
}

export function useContactDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: () => apiClient.get<Contact>(`/contacts/${id}`),
    enabled: id > 0,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContactInput) =>
      apiClient.post<Contact>("/contacts", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateContactInput) =>
      apiClient.patch<Contact>(`/contacts/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
      qc.invalidateQueries({ queryKey: queryKeys.contacts.detail(vars.id) });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/contacts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

// ─── Client Accounts ─────────────────────────────────────────────────────────

export function useClientAccounts(filters?: ClientAccountFilters) {
  return useQuery({
    queryKey: queryKeys.clients.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedClientAccounts>("/clients", filters as Record<string, unknown>),
  });
}

export function useClientAccount(id: number) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => apiClient.get<ClientAccountWithActivities>(`/clients/${id}`),
    enabled: id > 0,
  });
}

export function useClientActivities(clientId: number) {
  return useQuery({
    queryKey: queryKeys.clients.activities(clientId),
    queryFn: () => apiClient.get<ClientActivity[]>(`/clients/${clientId}/activities`),
    enabled: clientId > 0,
  });
}

export function useCreateClientAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ClientAccount>) =>
      apiClient.post<ClientAccount>("/clients", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

export function useUpdateClientAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateClientAccountStatusInput) =>
      apiClient.patch<ClientAccount>(`/clients/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
      qc.invalidateQueries({ queryKey: queryKeys.clients.detail(vars.id) });
    },
  });
}

export function useLogClientActivity() {
  const qc = useQueryClient();
  return useMutation({
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

// ─── Targets ─────────────────────────────────────────────────────────────────

export function useTargets(filters?: TargetFilters) {
  return useQuery({
    queryKey: queryKeys.targets.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<Target[]>("/targets", filters as Record<string, unknown>),
  });
}

export function useMyTargets() {
  return useQuery({
    queryKey: queryKeys.targets.myTargets(),
    queryFn: () => apiClient.get<Target[]>("/targets/my"),
  });
}

export function useTargetLeaderboard(metricType?: string) {
  return useQuery({
    queryKey: queryKeys.targets.leaderboard(metricType),
    queryFn: () =>
      apiClient.get<TargetLeaderboardEntry[]>(
        "/targets/leaderboard",
        metricType ? { metricType } : undefined
      ),
  });
}

export function useTargetHistory(targetId: number) {
  return useQuery({
    queryKey: queryKeys.targets.history(targetId),
    queryFn: () => apiClient.get<TargetHistory[]>(`/targets/${targetId}/history`),
    enabled: targetId > 0,
  });
}

export function useCreateTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTargetInput) =>
      apiClient.post<Target[]>("/targets", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.targets.all });
    },
  });
}

export function useUpdateTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateTargetInput) =>
      apiClient.patch<Target>(`/targets/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.targets.all });
    },
  });
}

export function useLogTargetProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: LogTargetProgressInput) =>
      apiClient.patch<Target>(`/targets/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.targets.all });
    },
  });
}

// ─── CRM Dashboards ──────────────────────────────────────────────────────────

export function useSalesDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.salesDashboard(),
    queryFn: () => apiClient.get<SalesDashboard>("/crm/sales-dashboard"),
  });
}

export function useMarketingDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.marketingDashboard(),
    queryFn: () => apiClient.get<MarketingDashboard>("/crm/marketing-dashboard"),
  });
}

export function useSupportDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.supportDashboard(),
    queryFn: () => apiClient.get<SupportDashboard>("/crm/support-dashboard"),
  });
}

// ─── Deal Activities ──────────────────────────────────────────────────────────

export function useDealActivities(dealId: number, limit?: number) {
  return useQuery({
    queryKey: queryKeys.dealActivities.list(dealId, limit ? { limit } : undefined),
    queryFn: () =>
      apiClient.get<DealActivity[]>(
        `/deals/${dealId}/activities`,
        limit ? { limit } : undefined
      ),
    enabled: dealId > 0,
  });
}

export function useLogDealActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, ...data }: LogDealActivityInput) =>
      apiClient.post<DealActivity>(`/deals/${dealId}/activities`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.dealActivities.list(vars.dealId) });
      qc.invalidateQueries({ queryKey: queryKeys.deals.detail(vars.dealId) });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/deals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

// ─── Client Account Stats ─────────────────────────────────────────────────────

export function useClientAccountStats() {
  return useQuery({
    queryKey: queryKeys.clientStats.stats(),
    queryFn: () => apiClient.get<ClientAccountStats>("/clients/stats"),
  });
}

// ─── CRM Organizations ────────────────────────────────────────────────────────

export function useCrmOrganizations(filters?: CrmOrganizationFilters) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedCrmOrganizations>(
        "/crm/organizations",
        filters as Record<string, unknown>
      ),
  });
}

export function useCrmOrganizationDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.detail(id),
    queryFn: () => apiClient.get<CrmOrganization>(`/crm/organizations/${id}`),
    enabled: id > 0,
  });
}

export function useCreateCrmOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCrmOrganizationInput) =>
      apiClient.post<CrmOrganization>("/crm/organizations", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.all });
    },
  });
}

// ─── CRM People (slug-based profiles) ────────────────────────────────────────

export function useCrmPeopleSlugs() {
  return useQuery({
    queryKey: queryKeys.crm.peopleSlugs(),
    queryFn: () => apiClient.get<Record<string, string>>("/crm/people-slugs"),
  });
}

export function useCrmPerson(slug: string) {
  return useQuery({
    queryKey: queryKeys.crm.person(slug),
    queryFn: () => apiClient.get<CrmPersonProfile | null>(`/crm/people/${slug}`),
    enabled: !!slug,
  });
}

export function useCustomerExecutiveDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.customerExecutiveDashboard(),
    queryFn: () => apiClient.get<CustomerExecutiveDashboard>("/crm/customer-executive"),
  });
}

