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
  ContactSearchResult,
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
  OrgHierarchyNode,
  OrgRollup,
  OrgTimelineEvent,
  RelatedLead,
} from "@/types/crm";

export type { DealActivity };

export function useDeals(filters?: DealFilters) {
  return useQuery({
    queryKey: queryKeys.deals.list(filters as Record<string, unknown>),
    queryFn: () => apiClient.get<Deal[]>("/deals", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export interface DealStats {
  active: number;
  pipelineValue: number;
  wonValue: number;
}

export function useDealStats() {
  return useQuery<DealStats, Error>({
    queryKey: queryKeys.deals.stats(),
    queryFn: () => apiClient.get<DealStats>("/deals/stats"),
    staleTime: 2 * 60_000,
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
    staleTime: 5 * 60_000,
  });
}

export function useDealDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.deals.detail(id),
    queryFn: () => apiClient.get<Deal>(`/deals/${id}`),
    enabled: id > 0,
    staleTime: 2 * 60_000,
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
    mutationFn: ({ id, stage, lostReason, version }: UpdateDealStageInput) =>
      apiClient.patch<Deal>(`/deals/${id}`, { stage, lostReason, version }),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: queryKeys.deals.all });
      const previous = qc.getQueryData<Deal[]>(queryKeys.deals.all);
      if (previous) {
        qc.setQueryData<Deal[]>(
          queryKeys.deals.all,
          previous.map((d) => (d.id === id ? { ...d, stage: stage as Deal["stage"] } : d))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.deals.all, context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
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
    staleTime: 2 * 60_000,
  });
}

export function useContactDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: () => apiClient.get<Contact>(`/contacts/${id}`),
    enabled: id > 0,
    staleTime: 2 * 60_000,
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

export function useContactSearch(q: string) {
  return useQuery({
    queryKey: ["contacts", "search", q],
    queryFn: () =>
      apiClient.get<ContactSearchResult[]>("/contacts/search", { q }),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}

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

export function useClientActivities(clientId: number) {
  return useQuery({
    queryKey: queryKeys.clients.activities(clientId),
    queryFn: () => apiClient.get<ClientActivity[]>(`/clients/${clientId}/activities`),
    enabled: clientId > 0,
    staleTime: 60_000,
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

export interface CrmAssignmentMember {
  userId: string;
  name: string | null;
  image: string | null;
  activeCount: number;
  totalCount: number;
}

export interface CrmAssignmentStats {
  members: CrmAssignmentMember[];
  unassignedCount: number;
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

export interface UpdateRenewalInput {
  accountId: number;
  renewalStage?: "upcoming" | "in_discussion" | "renewed" | "churned";
  renewalDate?: string | null;
  renewalNotes?: string | null;
}

export function useUpdateRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, ...data }: UpdateRenewalInput) =>
      apiClient.patch<ClientAccount>(`/clients/renewals/${accountId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.clients.all, "renewals"] });
    },
  });
}

export function useTargets(filters?: TargetFilters) {
  return useQuery({
    queryKey: queryKeys.targets.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<Target[]>("/targets", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useMyTargets() {
  return useQuery({
    queryKey: queryKeys.targets.myTargets(),
    queryFn: () => apiClient.get<Target[]>("/targets/my"),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
  });
}

export function useTargetHistory(targetId: number) {
  return useQuery({
    queryKey: queryKeys.targets.history(targetId),
    queryFn: () => apiClient.get<TargetHistory[]>(`/targets/${targetId}/history`),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
  });
}

export function useCommissionRules() {
  return useQuery({
    queryKey: [...queryKeys.deals.all, "commissionRules"] as const,
    queryFn: () => apiClient.get<Array<Record<string, unknown>>>("/sales/commission-rules"),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
  });
}

export function useDealApprovalRules() {
  return useQuery({
    queryKey: [...queryKeys.deals.all, "approvalRules"] as const,
    queryFn: () => apiClient.get<Array<{ id: number; minValue: string; approverRole: string; isActive: boolean; createdAt: string | null }>>("/deals/approval-rules"),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
  });
}

export function useChurnAlerts() {
  return useQuery({
    queryKey: [...queryKeys.clients.all, "churnAlerts"] as const,
    queryFn: () => apiClient.get<{
      alerts: ClientHealth[];
      summary: { critical: number; atRisk: number; total: number };
    }>("/clients/churn-alerts"),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
    enabled: clientId > 0,
  });
}

export function useSalesDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.salesDashboard(),
    queryFn: () => apiClient.get<SalesDashboard>("/crm/sales-dashboard"),
    staleTime: 2 * 60_000,
  });
}

export function useMarketingDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.marketingDashboard(),
    queryFn: () => apiClient.get<MarketingDashboard>("/crm/marketing-dashboard"),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
  });
}

export function useMarketingCampaignDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.marketingCampaigns.detail(id),
    queryFn: () => apiClient.get<MarketingCampaign>(`/marketing/campaigns/${id}`),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
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

export interface CampaignLead {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  source: string | null;
}

export interface CampaignLeadsResponse {
  leads: CampaignLead[];
  total: number;
}

export interface CampaignLeadFilters {
  status?: string;
  source?: string;
  q?: string;
}

export function useCampaignLeads(filters: CampaignLeadFilters) {
  return useQuery({
    queryKey: [...queryKeys.marketingCampaigns.all, "campaignLeads", filters] as const,
    queryFn: () => apiClient.get<CampaignLeadsResponse>("/marketing/campaigns/leads", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useBulkSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, leadIds }: { campaignId: number; leadIds: number[] }) =>
      apiClient.post<{ sent: number; campaignId: number }>(`/marketing/email-campaigns/${campaignId}/bulk-send`, { leadIds }),
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
    staleTime: 2 * 60_000,
  });
}

export function useSupportDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.supportDashboard(),
    queryFn: () => apiClient.get<SupportDashboard>("/crm/support-dashboard"),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
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

export function useCloneDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<Deal>(`/deals/${id}/clone`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function useClientAccountStats() {
  return useQuery({
    queryKey: queryKeys.clientStats.stats(),
    queryFn: () => apiClient.get<ClientAccountStats>("/clients/stats"),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
  });
}

export function useCrmOrganizationDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.detail(id),
    queryFn: () => apiClient.get<CrmOrganization>(`/crm/organizations/${id}`),
    staleTime: 2 * 60_000,
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

export function useUpdateCrmOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateCrmOrganizationInput> & { id: number; parentId?: number | null; notes?: string | null; healthScore?: number | null }) =>
      apiClient.patch<CrmOrganization>(`/crm/organizations/${id}`, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.all });
      qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.detail(variables.id) });
    },
  });
}

export function useDeleteCrmOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/organizations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.all });
    },
  });
}

export function useCrmOrgHierarchy(id: number) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.hierarchy(id),
    queryFn: () => apiClient.get<OrgHierarchyNode>(`/crm/organizations/${id}/hierarchy`),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useCrmOrgRollup(id: number) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.rollup(id),
    queryFn: () => apiClient.get<OrgRollup>(`/crm/organizations/${id}/roll-up`),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useCrmOrgTimeline(id: number) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.timeline(id),
    queryFn: () => apiClient.get<OrgTimelineEvent[]>(`/crm/organizations/${id}/timeline`),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useCrmOrgRelatedLeads(id: number) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.relatedLeads(id),
    queryFn: () => apiClient.get<RelatedLead[]>(`/crm/organizations/${id}/related-leads`),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useCrmPeopleSlugs() {
  return useQuery({
    queryKey: queryKeys.crm.peopleSlugs(),
    queryFn: () => apiClient.get<Record<string, string>>("/crm/people-slugs"),
    staleTime: 2 * 60_000,
  });
}

export function useCrmPerson(slug: string) {
  return useQuery({
    queryKey: queryKeys.crm.person(slug),
    queryFn: () => apiClient.get<CrmPersonProfile | null>(`/crm/people/${slug}`),
    staleTime: 2 * 60_000,
    enabled: !!slug,
  });
}

export function useCustomerExecutiveDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.customerExecutiveDashboard(),
    queryFn: () => apiClient.get<CustomerExecutiveDashboard>("/crm/customer-executive"),
    staleTime: 2 * 60_000,
  });
}


export interface DealMeeting {
  id: number;
  orgId: string;
  dealId: number;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  attendees: string[] | null;
  agenda: string | null;
  notes: string | null;
  actionItems: string | null;
  recordingLink: string | null;
  status: "scheduled" | "completed" | "cancelled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string | null } | null;
}

export interface CreateDealMeetingInput {
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  attendees?: string[];
  agenda?: string;
  notes?: string;
  actionItems?: string;
  recordingLink?: string;
  status?: "scheduled" | "completed" | "cancelled";
}

export function useDealMeetings(dealId: number) {
  return useQuery({
    queryKey: ["deals", dealId, "meetings"],
    queryFn: () => apiClient.get<DealMeeting[]>(`/deals/${dealId}/meetings`),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

export function useCreateDealMeeting(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDealMeetingInput) =>
      apiClient.post<DealMeeting>(`/deals/${dealId}/meetings`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", dealId, "meetings"] });
    },
  });
}

export function useUpdateDealMeeting(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, ...data }: Partial<CreateDealMeetingInput> & { meetingId: number }) =>
      apiClient.patch<DealMeeting>(`/deals/${dealId}/meetings/${meetingId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", dealId, "meetings"] });
    },
  });
}

export function useDeleteDealMeeting(dealId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: number) =>
      apiClient.delete<{ success: boolean }>(`/deals/${dealId}/meetings/${meetingId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", dealId, "meetings"] });
    },
  });
}


export interface WinLossAnalysis {
  summary: {
    won: number;
    wonValue: number;
    lost: number;
    lostValue: number;
    total: number;
    winRate: number;
  };
  lostByReason: Array<{ reason: string; count: number; totalValue: number }>;
}

export function useWinLossAnalysis() {
  return useQuery({
    queryKey: ["deals", "win-loss"],
    queryFn: () => apiClient.get<WinLossAnalysis>("/deals/win-loss"),
    staleTime: 2 * 60_000,
  });
}


export interface LeadSourceStat {
  source: string;
  count: number;
  converted: number;
  conversionRate: number;
  totalValue: number;
}

export interface LeadSourceReport {
  sources: LeadSourceStat[];
  total: number;
}

export function useLeadSourceReport() {
  return useQuery({
    queryKey: ["leads", "source-report"],
    queryFn: () => apiClient.get<LeadSourceReport>("/leads/source-report"),
    staleTime: 2 * 60_000,
  });
}


export interface SimpleClient {
  id: number;
  name: string;
}

export function useSimpleClientsList() {
  return useQuery({
    queryKey: ["clients", "simple-list"],
    queryFn: () => apiClient.get<SimpleClient[]>("/clients/list"),
    staleTime: 2 * 60_000,
  });
}


export interface ClientOpportunity {
  id: number;
  orgId: string;
  clientId: number;
  title: string;
  type: "upsell" | "cross_sell";
  stage: "identified" | "proposed" | "negotiating" | "won" | "lost";
  value: string | null;
  notes: string | null;
  expectedCloseDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: number; name: string } | null;
}

export interface CreateClientOpportunityInput {
  clientId: number;
  title: string;
  type?: "upsell" | "cross_sell";
  stage?: "identified" | "proposed" | "negotiating" | "won" | "lost";
  value?: string;
  notes?: string;
  expectedCloseDate?: string;
}

export function useClientOpportunities(clientId?: number) {
  return useQuery({
    queryKey: ["client-opportunities", clientId],
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
    mutationFn: (input: CreateClientOpportunityInput) =>
      apiClient.post<ClientOpportunity>("/clients/opportunities", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-opportunities"] }),
  });
}

export function useUpdateClientOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateClientOpportunityInput> & { id: number }) =>
      apiClient.patch<ClientOpportunity>(`/clients/opportunities/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-opportunities"] }),
  });
}

export function useDeleteClientOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/clients/opportunities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-opportunities"] }),
  });
}


export interface OnboardingTemplate {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
}

export interface OnboardingItem {
  id: number;
  orgId: string;
  clientId: number;
  templateId: number | null;
  title: string;
  description: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  completedAt: string | null;
  completedBy: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string | null } | null;
}

export function useOnboardingTemplates() {
  return useQuery({
    queryKey: ["onboarding-templates"],
    queryFn: () => apiClient.get<OnboardingTemplate[]>("/clients/onboarding/templates"),
    staleTime: 2 * 60_000,
  });
}

export function useClientOnboardingItems(clientId: number) {
  return useQuery({
    queryKey: ["onboarding-items", clientId],
    queryFn: () => apiClient.get<OnboardingItem[]>("/clients/onboarding/items", { clientId }),
    staleTime: 2 * 60_000,
    enabled: clientId > 0,
  });
}

export function useCreateOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      clientId: number; title: string; description?: string;
      assignedTo?: string; dueDate?: string; templateId?: number;
    }) => apiClient.post<OnboardingItem>("/clients/onboarding/items", input),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["onboarding-items", vars.clientId] }),
  });
}

export function useToggleOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed, clientId: _clientId }: { id: number; completed: boolean; clientId: number }) =>
      apiClient.patch<OnboardingItem>(`/clients/onboarding/items/${id}`, {
        completedAt: completed ? new Date().toISOString() : null,
      }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["onboarding-items", vars.clientId] }),
  });
}

export function useDeleteOnboardingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clientId: _clientId }: { id: number; clientId: number }) =>
      apiClient.delete(`/clients/onboarding/items/${id}`),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["onboarding-items", vars.clientId] }),
  });
}

export function useCreateOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string; isDefault?: boolean }) =>
      apiClient.post<OnboardingTemplate>("/clients/onboarding/templates", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding-templates"] }),
  });
}


export interface CsatSurvey {
  id: number;
  orgId: string;
  clientId: number | null;
  title: string;
  question: string;
  scaleMax: number;
  status: "draft" | "sent" | "closed";
  publicToken: string;
  sentAt: string | null;
  closedAt: string | null;
  createdBy: string;
  createdAt: string;
  responseCount?: number;
  avgRating?: number | null;
  client?: { id: number; name: string } | null;
}

export interface CsatResponse {
  id: number;
  surveyId: number;
  rating: number;
  comment: string | null;
  respondentName: string | null;
  respondentEmail: string | null;
  submittedAt: string;
}

export function useCsatSurveys() {
  return useQuery({
    queryKey: ["csat-surveys"],
    queryFn: () => apiClient.get<CsatSurvey[]>("/csat"),
    staleTime: 2 * 60_000,
  });
}

export function useCsatSurveyResponses(surveyId: number) {
  return useQuery({
    queryKey: ["csat-responses", surveyId],
    queryFn: () => apiClient.get<CsatResponse[]>(`/csat/${surveyId}/responses`),
    staleTime: 2 * 60_000,
    enabled: surveyId > 0,
  });
}

export function useCreateCsatSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; question?: string; clientId?: number; scaleMax?: number }) =>
      apiClient.post<CsatSurvey>("/csat", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["csat-surveys"] }),
  });
}

export function useUpdateCsatSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; status?: string; title?: string; question?: string }) =>
      apiClient.patch<CsatSurvey>(`/csat/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["csat-surveys"] }),
  });
}

export function useDeleteCsatSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/csat/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["csat-surveys"] }),
  });
}


export interface DuplicateLeadEntry {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  source: string | null;
  createdAt: string | null;
}

export interface DuplicateGroup {
  leads: DuplicateLeadEntry[];
  matchReason: string[];
  score: number;
}

export function useDuplicateLeads() {
  return useQuery({
    queryKey: queryKeys.leads.duplicates(),
    queryFn: () => apiClient.get<{ groups: DuplicateGroup[]; total: number }>("/leads/duplicates"),
    staleTime: 2 * 60 * 1000,
  });
}

export interface MergeLeadInput {
  keepLeadId: number;
  mergeLeadId: number;
}

export function useMergeLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ keepLeadId, mergeLeadId }: MergeLeadInput) =>
      apiClient.post<{ merged: boolean; winner: DuplicateLeadEntry }>("/leads/merge", {
        winnerId: keepLeadId,
        loserId: mergeLeadId,
        overrides: {},
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.leads.duplicates() });
      void qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}


export interface SlaByPriority {
  priority: string;
  total: number;
  withinSla: number;
  breached: number;
  avgResolutionHours: number;
  slaTarget: number;
}

export interface SlaRecentBreach {
  id: number;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
  hoursOpen: number;
  slaTarget: number;
}

export interface SlaStats {
  stats: {
    totalTickets: number;
    withinSla: number;
    slaBreached: number;
    complianceRate: number;
    avgResolutionHours: number;
  };
  byPriority: SlaByPriority[];
  recentBreaches: SlaRecentBreach[];
}

export function useSlaCompliance() {
  return useQuery({
    queryKey: ["sla", "compliance"],
    queryFn: () => apiClient.get<SlaStats>("/customer-executive/sla"),
    staleTime: 5 * 60 * 1000,
  });
}


export interface Territory {
  id: number;
  orgId: string;
  name: string;
  states: string[];
  cities: string[];
  assignedReps: number[];
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTerritoryInput {
  name: string;
  states?: string[];
  cities?: string[];
  assignedReps?: number[];
  description?: string;
  isActive?: boolean;
}

export interface UpdateTerritoryInput extends Partial<CreateTerritoryInput> {
  id: number;
}

export function useTerritories() {
  return useQuery({
    queryKey: ["territories"],
    queryFn: () => apiClient.get<Territory[]>("/crm/territories"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTerritoryInput) =>
      apiClient.post<Territory>("/crm/territories", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["territories"] }),
  });
}

export function useUpdateTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateTerritoryInput) =>
      apiClient.patch<Territory>(`/crm/territories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["territories"] }),
  });
}

export function useDeleteTerritory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/territories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["territories"] }),
  });
}


export interface CustomFieldDefinition {
  id: number;
  orgId: string;
  entityType: "lead" | "deal" | "contact";
  name: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean" | "select";
  options: Array<{ value: string; label: string }> | null;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export function useCustomFields(entityType: "lead" | "deal" | "contact") {
  return useQuery({
    queryKey: ["custom-fields", entityType] as const,
    queryFn: () =>
      apiClient.get<{ fields: CustomFieldDefinition[] }>(
        `/settings/custom-fields?entityType=${entityType}`
      ),
    staleTime: 2 * 60_000,
  });
}

export interface CreateCustomFieldInput {
  entityType: "lead" | "deal" | "contact";
  name: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean" | "select";
  options?: Array<{ value: string; label: string }>;
  isRequired?: boolean;
  sortOrder?: number;
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomFieldInput) =>
      apiClient.post<{ field: CustomFieldDefinition }>("/settings/custom-fields", input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["custom-fields", vars.entityType] });
    },
  });
}

export interface UpdateCustomFieldInput {
  id: number;
  entityType: "lead" | "deal" | "contact";
  label?: string;
  options?: Array<{ value: string; label: string }> | null;
  isRequired?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export function useUpdateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entityType: _et, ...data }: UpdateCustomFieldInput) =>
      apiClient.patch<{ field: CustomFieldDefinition }>(`/settings/custom-fields/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["custom-fields", vars.entityType] });
    },
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entityType: _et }: { id: number; entityType: "lead" | "deal" | "contact" }) =>
      apiClient.delete<{ success: boolean }>(`/settings/custom-fields/${id}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["custom-fields", vars.entityType] });
    },
  });
}

export function useUpdateLeadCustomData() {
  return useMutation({
    mutationFn: ({ id, customData }: { id: number; customData: Record<string, unknown> }) =>
      apiClient.patch<{ customData: Record<string, unknown> }>(`/leads/${id}/custom-data`, {
        customData,
      }),
  });
}

export function useUpdateDealCustomData() {
  return useMutation({
    mutationFn: ({ id, customData }: { id: number; customData: Record<string, unknown> }) =>
      apiClient.patch<{ customData: Record<string, unknown> }>(`/deals/${id}/custom-data`, {
        customData,
      }),
  });
}


export interface WebLeadFormField {
  name: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select";
  required: boolean;
  options?: string[];
}

export interface WebLeadForm {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  fields: WebLeadFormField[];
  publicToken: string;
  isActive: boolean;
  submitMessage: string;
  redirectUrl: string | null;
  totalSubmissions: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebLeadFormInput {
  name: string;
  description?: string;
  fields?: WebLeadFormField[];
  submitMessage?: string;
  redirectUrl?: string;
  isActive?: boolean;
}

export interface UpdateWebLeadFormInput extends Partial<CreateWebLeadFormInput> {
  id: number;
}

export function useWebLeadForms() {
  return useQuery({
    queryKey: queryKeys.webLeadForms.list(),
    queryFn: () => apiClient.get<WebLeadForm[]>("/crm/web-forms"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateWebLeadForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWebLeadFormInput) =>
      apiClient.post<WebLeadForm>("/crm/web-forms", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.webLeadForms.all });
    },
  });
}

export function useUpdateWebLeadForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateWebLeadFormInput) =>
      apiClient.patch<WebLeadForm>(`/crm/web-forms/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.webLeadForms.all });
    },
  });
}

export function useDeleteWebLeadForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/web-forms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.webLeadForms.all });
    },
  });
}


export interface SalesDashboardFilters {
  from?: string;
  to?: string;
  repId?: number;
}

export interface SalesDashboardKPIsResult {
  totalRevenue: number;
  pipelineValue: number;
  closeRate: number;
  avgDealSize: number;
  dealsWon: number;
  totalDeals: number;
  prevRevenue: number;
  prevCloseRate: number;
  prevAvgDealSize: number;
}

export interface SalesFunnelStageResult {
  stage: string;
  count: number;
  value: number;
  color: string;
  dropOffPct: number | null;
}

export interface SalesLeaderboardEntryResult {
  repId: number;
  name: string;
  initials: string;
  dealsWon: number;
  totalDeals: number;
  revenue: number;
  winRate: number;
}

export interface RevenueVsGoalEntryResult {
  month: string;
  actual: number;
  target: number;
}

export function useSalesDashboardKPIs(filters: SalesDashboardFilters = {}) {
  const params: Record<string, unknown> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.repId) params.repId = String(filters.repId);

  return useQuery({
    queryKey: queryKeys.crm.salesKpis(params),
    queryFn: () => apiClient.get<SalesDashboardKPIsResult>("/sales/dashboard/kpis", params),
    staleTime: 2 * 60_000,
  });
}

export function useSalesDashboardFunnel(filters: Omit<SalesDashboardFilters, "repId"> & { repId?: number } = {}) {
  const params: Record<string, unknown> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.repId) params.repId = String(filters.repId);

  return useQuery({
    queryKey: queryKeys.crm.salesFunnel(params),
    queryFn: () => apiClient.get<SalesFunnelStageResult[]>("/sales/dashboard/funnel", params),
    staleTime: 2 * 60_000,
  });
}

export function useSalesDashboardLeaderboard(filters: Pick<SalesDashboardFilters, "from" | "to"> = {}) {
  const params: Record<string, unknown> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  return useQuery({
    queryKey: queryKeys.crm.salesLeaderboard(params),
    queryFn: () => apiClient.get<SalesLeaderboardEntryResult[]>("/sales/dashboard/leaderboard", params),
    staleTime: 2 * 60_000,
  });
}

export function useRevenueVsGoal(year?: number) {
  const y = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: queryKeys.crm.revenueVsGoal(y),
    queryFn: () => apiClient.get<RevenueVsGoalEntryResult[]>("/sales/dashboard/revenue-vs-goal", { year: String(y) }),
    staleTime: 2 * 60_000,
  });
}

export interface DealVelocityResult {
  avgDaysToClose: number;
  medianDaysToClose: number;
  fastestCloseDays: number;
  slowestCloseDays: number;
  dealCount: number;
}

export interface AgingDealResult {
  id: number;
  companyName: string;
  stage: string;
  value: number;
  daysSinceUpdate: number;
  salesRepId: number | null;
}

export function useDealVelocity(filters: Pick<SalesDashboardFilters, "from" | "to"> = {}) {
  const params: Record<string, unknown> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  return useQuery({
    queryKey: ["sales", "velocity", params],
    queryFn: () => apiClient.get<DealVelocityResult>("/sales/dashboard/velocity", params),
    staleTime: 2 * 60_000,
  });
}

export function useAgingDeals(thresholdDays = 14) {
  return useQuery({
    queryKey: ["sales", "aging", thresholdDays],
    queryFn: () => apiClient.get<AgingDealResult[]>("/sales/dashboard/aging", { threshold: String(thresholdDays) }),
    staleTime: 5 * 60 * 1000,
  });
}


export interface CycleLengthResult {
  avgDays: number | null;
  medianDays: number | null;
  minDays: number | null;
  maxDays: number | null;
  histogram: { label: string; count: number }[];
  totalDeals: number;
}

export function useSalesCycleLength(repId?: string) {
  const params: Record<string, string> = {};
  if (repId) params.repId = repId;
  return useQuery({
    queryKey: ["sales", "cycleLength", repId],
    queryFn: () => apiClient.get<CycleLengthResult>("/sales/dashboard/cycle-length", params),
    staleTime: 5 * 60 * 1000,
  });
}


export interface LostAnalysisResult {
  total: number;
  totalValue: number;
  reasons: { reason: string; count: number; totalValue: number; pct: number }[];
}

export function useLostDealAnalysis(repId?: string) {
  const params: Record<string, string> = {};
  if (repId) params.repId = repId;
  return useQuery({
    queryKey: ["sales", "lostAnalysis", repId],
    queryFn: () => apiClient.get<LostAnalysisResult>("/sales/dashboard/lost-analysis", params),
    staleTime: 5 * 60 * 1000,
  });
}


export interface CohortRow {
  cohortMonth: string;
  created: number;
  converted: number;
  conversionRate: number;
  avgDaysToConvert: number | null;
}

export function useSalesCohort(months = 6) {
  return useQuery({
    queryKey: ["sales", "cohort", months],
    queryFn: () => apiClient.get<CohortRow[]>("/sales/dashboard/cohort", { months: String(months) }),
    staleTime: 5 * 60 * 1000,
  });
}


export interface RepMonthStat {
  month: string;
  dealsWon: number;
  revenue: number;
}

export interface RepComparisonData {
  repId: number;
  name: string;
  initials: string;
  dealsWon: number;
  totalDeals: number;
  revenue: number;
  winRate: number;
  avgDealSize: number;
  monthly: RepMonthStat[];
}

export function useRepComparison(rep1Id: number | null, rep2Id: number | null) {
  return useQuery({
    queryKey: ["sales", "repComparison", rep1Id, rep2Id],
    queryFn: () =>
      apiClient.get<{ rep1: RepComparisonData; rep2: RepComparisonData }>(
        "/sales/dashboard/rep-comparison",
        { rep1: String(rep1Id), rep2: String(rep2Id) },
      ),
    enabled: !!rep1Id && !!rep2Id,
    staleTime: 5 * 60 * 1000,
  });
}

