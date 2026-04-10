"use client";

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

export function useDeals(filters?: DealFilters) {
  return useQuery({
    queryKey: queryKeys.deals.list(filters as Record<string, unknown>),
    queryFn: () => apiClient.get<Deal[]>("/deals", filters as Record<string, unknown>),
  });
}

export interface DealForecast {
  totalWeighted: number;
  totalBestCase: number;
  totalDeals: number;
  byMonth: Array<{ month: string; label: string; weighted: number; bestCase: number; dealCount: number }>;
  byStage: Array<{ stage: string; count: number; totalValue: number; weightedValue: number; avgProbability: number }>;
}

export function useDealForecast() {
  return useQuery({
    queryKey: queryKeys.deals.forecast(),
    queryFn: () => apiClient.get<DealForecast>("/deals/forecast"),
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

export interface SalesQuota {
  id: number;
  userId: string;
  userName: string | null;
  period: string;
  startDate: string;
  endDate: string;
  targetRevenue: string;
  actualRevenue: string;
  attainmentPct: number;
  notes: string | null;
  createdAt: string | null;
}

export function useSalesQuotas(params?: { userId?: string; period?: string }) {
  return useQuery({
    queryKey: queryKeys.salesQuotas.list(params as Record<string, unknown>),
    queryFn: () => apiClient.get<SalesQuota[]>("/sales/quotas", params as Record<string, unknown>),
  });
}

export function useCreateSalesQuota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; period: string; startDate: string; endDate: string; targetRevenue: string; notes?: string }) =>
      apiClient.post<SalesQuota>("/sales/quotas", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.salesQuotas.all });
    },
  });
}

export function useCommissions(params?: { userId?: string; status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.deals.all, "commissions", params] as const,
    queryFn: () => apiClient.get<{ items: Array<Record<string, unknown>>; totalPending: number; totalPaid: number }>("/sales/commissions", params as Record<string, unknown>),
  });
}

export function useCommissionRules() {
  return useQuery({
    queryKey: [...queryKeys.deals.all, "commissionRules"] as const,
    queryFn: () => apiClient.get<Array<Record<string, unknown>>>("/sales/commission-rules"),
  });
}

export function useCreateCommissionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; type: string; flatRate?: string; tiers?: Array<{ minValue: number; maxValue?: number; rate: number }>; appliesTo?: string }) =>
      apiClient.post("/sales/commission-rules", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.deals.all, "commissionRules"] }),
  });
}

export function useDealApprovals(params?: { status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.deals.all, "approvals", params] as const,
    queryFn: () => apiClient.get<Array<Record<string, unknown>>>("/deals/approvals", params as Record<string, unknown>),
  });
}

export function useDealApprovalRules() {
  return useQuery({
    queryKey: [...queryKeys.deals.all, "approvalRules"] as const,
    queryFn: () => apiClient.get<Array<{ id: number; minValue: string; approverRole: string; isActive: boolean; createdAt: string | null }>>("/deals/approval-rules"),
  });
}

export function useCreateDealApprovalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { minValue: string; approverRole?: string }) =>
      apiClient.post("/deals/approval-rules", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.deals.all, "approvalRules"] }),
  });
}

export function useRequestDealApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { dealId: number; requestedStage: string }) =>
      apiClient.post("/deals/approvals", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.deals.all, "approvals"] }),
  });
}

export function useResolveDealApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { approvalId: number; action: "approve" | "reject"; rejectionReason?: string }) =>
      apiClient.post("/deals/approvals", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.deals.all, "approvals"] });
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export interface ClientHealth {
  id: number;
  name: string;
  company: string | null;
  healthScore: number | null;
  healthStatus: string | null;
  churnRiskScore: number | null;
  churnRiskReasoning: string | null;
  lastHealthCheck: string | null;
  investmentValue: string | null;
  status: string;
}

export function useClientHealth(params?: { status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.clients.all, "health", params] as const,
    queryFn: () => apiClient.get<{ items: ClientHealth[]; summary: { healthy: number; at_risk: number; critical: number } }>("/clients/health", params as Record<string, unknown>),
  });
}

export function useChurnAlerts() {
  return useQuery({
    queryKey: [...queryKeys.clients.all, "churnAlerts"] as const,
    queryFn: () => apiClient.get<{
      alerts: ClientHealth[];
      summary: { critical: number; atRisk: number; total: number };
    }>("/clients/churn-alerts"),
  });
}

export interface ClientTimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  user?: string;
}

export function useClientTimeline(clientId: number) {
  return useQuery({
    queryKey: [...queryKeys.clients.detail(clientId), "timeline"] as const,
    queryFn: () => apiClient.get<{ events: ClientTimelineEvent[]; total: number }>(`/clients/${clientId}/timeline`),
    enabled: clientId > 0,
  });
}

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

export interface MarketingCampaign {
  id: number;
  orgId: string;
  name: string;
  status: "active" | "paused" | "completed";
  channel: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  targetAudience: string | null;
  leads: number;
  spend: string;
  roi: string;
  budgetAllocated: string | null;
  budgetSpent: string | null;
  ownerId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export function useMarketingCampaigns(params?: { status?: string }) {
  return useQuery({
    queryKey: queryKeys.marketingCampaigns.list(params as Record<string, unknown>),
    queryFn: () => apiClient.get<MarketingCampaign[]>("/marketing/campaigns", params as Record<string, unknown>),
  });
}

export function useMarketingCampaignDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.marketingCampaigns.detail(id),
    queryFn: () => apiClient.get<MarketingCampaign>(`/marketing/campaigns/${id}`),
    enabled: id > 0,
  });
}

export function useCreateMarketingCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; status?: string; channel?: string; description?: string; startDate?: string; endDate?: string; targetAudience?: string; budgetAllocated?: string }) =>
      apiClient.post<MarketingCampaign>("/marketing/campaigns", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all });
      qc.invalidateQueries({ queryKey: queryKeys.crm.marketingDashboard() });
    },
  });
}

export function useUpdateMarketingCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<{ name: string; status: string; channel: string; description: string; startDate: string; endDate: string; targetAudience: string; budgetAllocated: string; budgetSpent: string }>) =>
      apiClient.patch<MarketingCampaign>(`/marketing/campaigns/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all });
      qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.detail(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.crm.marketingDashboard() });
    },
  });
}

export function useDeleteMarketingCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/marketing/campaigns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all });
      qc.invalidateQueries({ queryKey: queryKeys.crm.marketingDashboard() });
    },
  });
}

export interface EmailCampaign {
  id: number;
  name: string;
  subject: string;
  body: string;
  status: string;
  recipientFilter: Record<string, unknown> | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string | null;
}

export function useEmailCampaigns(params?: { status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.marketingCampaigns.all, "email", params] as const,
    queryFn: () => apiClient.get<EmailCampaign[]>("/marketing/email-campaigns", params as Record<string, unknown>),
  });
}

export function useCreateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; subject: string; body: string; templateId?: number; recipientFilter?: Record<string, unknown>; scheduledAt?: string }) =>
      apiClient.post<EmailCampaign>("/marketing/email-campaigns", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useUpdateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<{ name: string; subject: string; body: string; status: string }>) =>
      apiClient.patch<EmailCampaign>(`/marketing/email-campaigns/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useSendEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: number) =>
      apiClient.post<{ sent: number; campaignId: number; status: string }>(`/marketing/email-campaigns/${campaignId}/send`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useDeleteEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/marketing/email-campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useGenerateUtmLink() {
  return useMutation({
    mutationFn: (input: { baseUrl: string; source: string; medium: string; campaign: string; term?: string; content?: string }) =>
      apiClient.post<{ url: string; params: Record<string, string | undefined> }>("/marketing/utm", input),
  });
}

export function useUtmAttribution(params?: { source?: string }) {
  return useQuery({
    queryKey: [...queryKeys.marketingCampaigns.all, "utmAttribution", params] as const,
    queryFn: () => apiClient.get<{ attribution: Array<{ source: string | null; count: number; totalValue: number }> }>("/marketing/utm", params as Record<string, unknown>),
  });
}

export function useSupportDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.supportDashboard(),
    queryFn: () => apiClient.get<SupportDashboard>("/crm/support-dashboard"),
  });
}

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

export function useClientAccountStats() {
  return useQuery({
    queryKey: queryKeys.clientStats.stats(),
    queryFn: () => apiClient.get<ClientAccountStats>("/clients/stats"),
  });
}

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

