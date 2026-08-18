"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Document, DocumentType } from "@/types/hr";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

export interface HrDocumentListParams {
  cursor?: string;
  limit?: number;
  userId?: string;
  type?: DocumentType;
  search?: string;
  category?: string;
}

export interface HrDocumentListResponse {
  data: Document[];
  pageInfo: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export const hrDocumentListPrefix = queryKeys.hr.documentsAll;

export function useHrDocumentList(params?: HrDocumentListParams) {
  const canDocs = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  const queryParams: Record<string, unknown> = {
    limit: params?.limit ?? 20,
    ...(params?.cursor ? { cursor: params.cursor } : {}),
    ...(params?.userId ? { userId: params.userId } : {}),
    ...(params?.type ? { type: params.type } : {}),
    ...(params?.search ? { search: params.search } : {}),
    ...(params?.category && params.category !== "All Files"
      ? { category: params.category }
      : {}),
  };
  return useQuery({
    queryKey: queryKeys.hr.documents(queryParams),
    queryFn: () => apiClient.get<HrDocumentListResponse>("/hr/documents", queryParams),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: hrEnabled && canDocs,
  });
}

export interface HrDocumentStats {
  total: number;
  byType: Record<string, number>;
  publicCount: number;
  storageBytes: number;
  expiringIn30Days: number;
}

export function useHrDocumentStats(options?: { enabled?: boolean }) {
  const canDocs = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.documentsStats(),
    queryFn: () => apiClient.get<HrDocumentStats>("/hr/documents/stats"),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canDocs && (options?.enabled ?? true),
  });
}

interface HrExpiringCertification {
  id: number;
  name: string;
  expiryDate: string | null;
  user?: { id: string; name: string | null } | null;
}

export interface HrDocumentExpiryResponse {
  expiringDocuments: Document[];
  expiringCertifications: HrExpiringCertification[];
  totalExpiring: number;
}

export function useHrDocumentExpiry(
  days = 30,
  options?: { enabled?: boolean },
) {
  const canDocs = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: queryKeys.hr.documentsExpiry(days),
    queryFn: () =>
      apiClient.get<HrDocumentExpiryResponse>("/hr/document-expiry", { days }),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canDocs && (options?.enabled ?? true),
  });
}

export type MyOnboardingDocStatus =
  | "PENDING"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "RE_UPLOAD_REQUESTED";

export interface MyOnboardingDoc {
  id: number;
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean | null;
  status: MyOnboardingDocStatus;
  remarks: string | null;
  version: number | null;
  createdAt: string | null;
}

interface MyOnboardingDocsResponse {
  data: MyOnboardingDoc[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const MY_DOCS_LIMIT = 100;

export function useMyOnboardingDocs(options?: { enabled?: boolean }) {
  const canView = useCan("self:onboarding-docs");
  const params = { page: 1, limit: MY_DOCS_LIMIT };
  return useQuery({
    queryKey: queryKeys.hr.onboardingDocs(params),
    queryFn: () =>
      apiClient.get<MyOnboardingDocsResponse>("/hr/onboarding-docs/me", params),
    staleTime: 60_000,
    enabled: canView && (options?.enabled ?? true),
  });
}

interface OnboardingDocsSummaryTotals {
  pagination: { total: number };
}

export function useMissingOnboardingDocsCount(options?: { enabled?: boolean }) {
  const canOnboarding = useCan("hr:onboarding:manage");
  const enabled = canOnboarding && (options?.enabled ?? true);

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
