"use client";

import {  } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
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
  return useGatedQuery("dashboard:support:view", {
    queryKey: queryKeys.crm.supportDashboard(),
    queryFn: ({ signal }) => apiClient.get<SupportDashboard>("/crm/support-dashboard", undefined, signal),
    staleTime: 2 * 60_000,
  });
}

export function useSalesDashboardKPIs(filters: SalesDashboardFilters = {}) {
  const params: Record<string, unknown> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.repId) params.repId = String(filters.repId);

  return useGatedQuery("sales:view", {
    queryKey: queryKeys.crm.salesKpis(params),
    queryFn: ({ signal }) => apiClient.get<SalesDashboardKPIsResult>("/sales/dashboard/kpis", params, signal),
    staleTime: 2 * 60_000,
  });
}

export function useRevenueVsGoal(year?: number) {
  const y = year ?? new Date().getFullYear();
  return useGatedQuery("sales:view", {
    queryKey: queryKeys.crm.revenueVsGoal(y),
    queryFn: ({ signal }) => apiClient.get<RevenueVsGoalEntryResult[]>("/sales/dashboard/revenue-vs-goal", { year: String(y) }, signal),
    staleTime: 2 * 60_000,
  });
}
