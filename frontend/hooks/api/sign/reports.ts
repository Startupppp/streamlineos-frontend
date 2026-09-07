"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
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
  senderPerformance: { senderMembershipId: number | null; senderName: string | null; sentCount: number }[];
  templateUsage: { templateId: number | null; templateName: string; value: number }[];
  bulkSendStats: { totalJobs: number; totalRows: number; successRows: number; failedRows: number } | null;
  authFailures: number;
  watermarkUsageCount: number;
}

const signDashboardContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signDashboardContract),
);

const signSummaryContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signSummaryContract),
);

export function useSignDashboard() {
  return useGatedQuery("sign:envelope:view", {
    queryKey: [...growthAndSignQueryKeys.signEnvelopes.all, "dashboard"] as const,
    queryFn: ({ signal }) => apiClient.get<SignDashboardStats>("/sign/reports/dashboard", undefined, signal, signDashboardContract),
    staleTime: 30_000,
  });
}

export function useSignSummary() {
  return useGatedQuery("sign:audit:view", {
    queryKey: [...growthAndSignQueryKeys.signEnvelopes.all, "summary"] as const,
    queryFn: ({ signal }) => apiClient.get<SignSummaryStats>("/sign/reports/summary", undefined, signal, signSummaryContract),
    staleTime: 60_000,
  });
}
