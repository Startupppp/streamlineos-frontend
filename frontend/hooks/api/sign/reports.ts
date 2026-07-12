"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SignAuditEvent } from "@/types/sign";

export interface SignDashboardStats {
  awaitingMe: number;
  sentPending: number;
  completedThisMonth: number;
  expiringSoon: number;
  failedOrBounced: number;
  recentActivity: SignAuditEvent[];
}

export interface SignSummaryStats {
  byStatus: Record<string, number>;
  avgTimeToSignHours: number | null;
  completionRate: number;
  declineRate: number;
  expiringSoonCount: number;
  senderPerformance: { senderUserId: string; senderName: string | null; sentCount: number }[];
  templateUsage: { templateId: number; templateName: string; value: number }[];
  bulkSendStats: { totalJobs: number; totalRows: number; successRows: number; failedRows: number };
  authFailures: number;
  watermarkUsageCount: number;
}

export function useSignDashboard() {
  return useQuery({
    queryKey: [...queryKeys.signEnvelopes.all, "dashboard"] as const,
    queryFn: () => apiClient.get<SignDashboardStats>("/sign/reports/dashboard"),
    staleTime: 30_000,
  });
}

export function useSignSummary() {
  return useQuery({
    queryKey: [...queryKeys.signEnvelopes.all, "summary"] as const,
    queryFn: () => apiClient.get<SignSummaryStats>("/sign/reports/summary"),
    staleTime: 60_000,
  });
}
