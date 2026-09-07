"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

const documentListLazy = lazyContract(() =>
  import("@/hooks/api/hr/documents-schema").then((m) => m.documentListContract),
);
const documentStatsLazy = lazyContract(() =>
  import("@/hooks/api/hr/documents-schema").then((m) => m.documentStatsContract),
);
const documentExpiryLazy = lazyContract(() =>
  import("@/hooks/api/hr/documents-schema").then((m) => m.documentExpiryContract),
);
const myOnboardingDocsLazy = lazyContract(() =>
  import("@/hooks/api/hr/documents-schema").then((m) => m.myOnboardingDocsContract),
);
const onboardingDocsSummaryLazy = lazyContract(() =>
  import("@/hooks/api/hr/documents-schema").then((m) => m.onboardingDocsSummaryContract),
);
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

export const hrDocumentListPrefix = humanResourcesQueryKeys.hr.documentsAll;

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
    queryKey: humanResourcesQueryKeys.hr.documents(queryParams),
    queryFn: ({ signal }) => apiClient.get<HrDocumentListResponse>("/hr/documents", queryParams, signal),
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
    queryKey: humanResourcesQueryKeys.hr.documentsStats(),
    queryFn: ({ signal }) => apiClient.get<HrDocumentStats>("/hr/documents/stats", undefined, signal, documentStatsLazy),
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
    queryKey: humanResourcesQueryKeys.hr.documentsExpiry(days),
    queryFn: ({ signal }) =>
      apiClient.get<HrDocumentExpiryResponse>("/hr/document-expiry", { days }, signal),
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
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

const MY_DOCS_LIMIT = 100;

export function useMyOnboardingDocs(options?: { enabled?: boolean }) {
  const canView = useCan("self:onboarding-docs");
  const params = { limit: MY_DOCS_LIMIT };
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.onboardingDocs(params),
    queryFn: ({ signal }) =>
      apiClient.get<MyOnboardingDocsResponse>("/hr/onboarding-docs/me", params, signal, myOnboardingDocsLazy),
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
    queryKey: humanResourcesQueryKeys.hr.onboardingDocsSummary({ limit: 1 }),
    queryFn: ({ signal }) =>
      apiClient.get<OnboardingDocsSummaryTotals>("/hr/onboarding-docs/summary", {
        limit: 1,
      }, signal, onboardingDocsSummaryLazy),
    staleTime: 2 * 60_000,
    enabled,
  });
  const approvedQuery = useQuery({
    queryKey: humanResourcesQueryKeys.hr.onboardingDocsSummary({ limit: 1, status: "APPROVED" }),
    queryFn: ({ signal }) =>
      apiClient.get<OnboardingDocsSummaryTotals>("/hr/onboarding-docs/summary", {
        limit: 1,
        status: "APPROVED",
      }, signal, onboardingDocsSummaryLazy),
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
