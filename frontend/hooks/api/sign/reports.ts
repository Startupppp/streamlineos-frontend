"use client";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SignAuditEvent } from "@/types/sign";
import { useGatedQuery } from "@/hooks/api/gated-query";

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
  return useGatedQuery("sign:envelope:view", {
    queryKey: [...queryKeys.signEnvelopes.all, "dashboard"] as const,
    queryFn: ({ signal }) => apiClient.get<SignDashboardStats>("/sign/reports/dashboard", undefined, signal),
    staleTime: 30_000,
  });
}

export function useSignSummary() {
  return useGatedQuery("sign:audit:view", {
    queryKey: [...queryKeys.signEnvelopes.all, "summary"] as const,
    queryFn: ({ signal }) => apiClient.get<SignSummaryStats>("/sign/reports/summary", undefined, signal),
    staleTime: 60_000,
  });
}
