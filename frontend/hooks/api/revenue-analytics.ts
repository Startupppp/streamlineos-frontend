"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  churnRate: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  ltv: number;
  cac: number;
  expansionRevenue: number;
  trialConversionRate: number;
  refundRate: number;
}

export interface TimeSeriesPoint {
  month: string;
  newMrr: number;
  churnMrr: number;
  netNew: number;
}

export interface RevenueAnalytics {
  metrics: RevenueMetrics;
  timeSeries: TimeSeriesPoint[];
}

export function useRevenueAnalytics(period: "3m" | "6m" | "12m" = "6m") {
  return useQuery<RevenueAnalytics>({
    queryKey: ["billing", "analytics", period],
    queryFn: () =>
      apiClient.get<RevenueAnalytics>(`/billing/analytics?period=${period}`),
    staleTime: 5 * 60 * 1000,
  });
}
