"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  SupportDashboard,
} from "@/types/crm";

interface SalesDashboardFilters {
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

export interface RevenueVsGoalEntryResult {
  month: string;
  actual: number;
  target: number;
}


export function useSupportDashboard() {
  const canView = useCan("dashboard:support:view");
  return useQuery({
    queryKey: queryKeys.crm.supportDashboard(),
    queryFn: () => apiClient.get<SupportDashboard>("/crm/support-dashboard"),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useSalesDashboardKPIs(filters: SalesDashboardFilters = {}) {
  const canView = useCan("sales:view");
  const params: Record<string, unknown> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.repId) params.repId = String(filters.repId);

  return useQuery({
    queryKey: queryKeys.crm.salesKpis(params),
    queryFn: () => apiClient.get<SalesDashboardKPIsResult>("/sales/dashboard/kpis", params),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useRevenueVsGoal(year?: number) {
  const canView = useCan("sales:view");
  const y = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: queryKeys.crm.revenueVsGoal(y),
    queryFn: () => apiClient.get<RevenueVsGoalEntryResult[]>("/sales/dashboard/revenue-vs-goal", { year: String(y) }),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}
