"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Document, DocumentType } from "@/types/hr";

export interface HrDocumentListParams {
  page?: number;
  limit?: number;
  userId?: string;
  type?: DocumentType;
}

export interface HrDocumentListResponse {
  data: Document[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const hrDocumentListPrefix = [...queryKeys.hr.all, "documents"] as const;

export function useHrDocumentList(params?: HrDocumentListParams) {
  const queryParams: Record<string, unknown> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    ...(params?.userId ? { userId: params.userId } : {}),
    ...(params?.type ? { type: params.type } : {}),
  };
  return useQuery({
    queryKey: queryKeys.hr.documents(queryParams),
    queryFn: () => apiClient.get<HrDocumentListResponse>("/hr/documents", queryParams),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export interface HrDocumentStats {
  total: number;
  byType: Record<string, number>;
  expiringIn30Days: number;
}

export function useHrDocumentStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.hr.documentsStats(),
    queryFn: () => apiClient.get<HrDocumentStats>("/hr/documents/stats"),
    staleTime: 2 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

interface OnboardingDocsSummaryTotals {
  pagination: { total: number };
}

export function useMissingOnboardingDocsCount(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;

  const totalQuery = useQuery({
    queryKey: queryKeys.hr.onboardingDocsSummary({ limit: 1 }),
    queryFn: () =>
      apiClient.get<OnboardingDocsSummaryTotals>("/hr/onboarding-docs/summary", {
        limit: 1,
      }),
    staleTime: 2 * 60_000,
    enabled,
  });
  const approvedQuery = useQuery({
    queryKey: queryKeys.hr.onboardingDocsSummary({ limit: 1, status: "APPROVED" }),
    queryFn: () =>
      apiClient.get<OnboardingDocsSummaryTotals>("/hr/onboarding-docs/summary", {
        limit: 1,
        status: "APPROVED",
      }),
    staleTime: 2 * 60_000,
    enabled,
  });

  const total = totalQuery.data?.pagination.total;
  const approved = approvedQuery.data?.pagination.total;

  return {
    missingCount:
      total !== undefined && approved !== undefined
        ? Math.max(total - approved, 0)
        : undefined,
    isLoading: totalQuery.isLoading || approvedQuery.isLoading,
  };
}
