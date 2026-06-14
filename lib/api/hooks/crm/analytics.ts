"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  SalesDashboard,
  MarketingDashboard,
  SupportDashboard,
  CustomerExecutiveDashboard,
} from "@/types/crm";

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

export interface CycleLengthResult {
  avgDays: number | null;
  medianDays: number | null;
  minDays: number | null;
  maxDays: number | null;
  histogram: { label: string; count: number }[];
  totalDeals: number;
}

export interface LostAnalysisResult {
  total: number;
  totalValue: number;
  reasons: { reason: string; count: number; totalValue: number; pct: number }[];
}

export interface CohortRow {
  cohortMonth: string;
  created: number;
  converted: number;
  conversionRate: number;
  avgDaysToConvert: number | null;
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

export function useSupportDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.supportDashboard(),
    queryFn: () => apiClient.get<SupportDashboard>("/crm/support-dashboard"),
    staleTime: 2 * 60_000,
  });
}

export function useCustomerExecutiveDashboard() {
  return useQuery({
    queryKey: queryKeys.crm.customerExecutiveDashboard(),
    queryFn: () => apiClient.get<CustomerExecutiveDashboard>("/crm/customer-executive"),
    staleTime: 2 * 60_000,
  });
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

export function useSalesCycleLength(repId?: string) {
  const params: Record<string, string> = {};
  if (repId) params.repId = repId;
  return useQuery({
    queryKey: ["sales", "cycleLength", repId],
    queryFn: () => apiClient.get<CycleLengthResult>("/sales/dashboard/cycle-length", params),
    staleTime: 5 * 60 * 1000,
  });
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

export function useSalesCohort(months = 6) {
  return useQuery({
    queryKey: ["sales", "cohort", months],
    queryFn: () => apiClient.get<CohortRow[]>("/sales/dashboard/cohort", { months: String(months) }),
    staleTime: 5 * 60 * 1000,
  });
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

export function useEmailCampaigns(params?: { status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.marketingCampaigns.all, "email", params] as const,
    queryFn: () => apiClient.get<EmailCampaign[]>("/marketing/email-campaigns", params as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useCampaignLeads(filters: CampaignLeadFilters) {
  return useQuery({
    queryKey: [...queryKeys.marketingCampaigns.all, "campaignLeads", filters] as const,
    queryFn: () => apiClient.get<CampaignLeadsResponse>("/marketing/campaigns/leads", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useUtmAttribution(params?: { source?: string }) {
  return useQuery({
    queryKey: [...queryKeys.marketingCampaigns.all, "utmAttribution", params] as const,
    queryFn: () => apiClient.get<{ attribution: Array<{ source: string | null; count: number; totalValue: number }> }>("/marketing/utm", params as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}
