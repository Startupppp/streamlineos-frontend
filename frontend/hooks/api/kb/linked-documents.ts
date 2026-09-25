"use client";

import { keepPreviousData, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { readErrorExceptNotFoundReachesBoundary } from "@/lib/query-error-policy";

const listLazy = lazyContract(() => import("@/hooks/api/kb/linked-documents-schema").then((m) => m.linkedDocumentListContract));
const detailLazy = lazyContract(() => import("@/hooks/api/kb/linked-documents-schema").then((m) => m.linkedDocumentDetailContract));
const openLazy = lazyContract(() => import("@/hooks/api/kb/linked-documents-schema").then((m) => m.openLinkedDocumentContract));

export type LinkedDocumentStatus = "active" | "unpublished" | "source_removed";

export interface LinkedDocumentItem {
  id: number;
  name: string | null;
  description: string | null;
  category: string | null;
  tags: string[];
  documentType: string | null;
  effectiveDate: string | null;
  version: number | null;
  publishedAt: string;
  source: "HR_DOCUMENT";
  hasFile: boolean;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  status: LinkedDocumentStatus;
  versionMode: "FOLLOW_LATEST" | "PINNED";
  pinnedVersion: number | null;
}

export interface LinkedDocumentDetail extends LinkedDocumentItem {
  audiences: Array<{ kind: "ALL_EMPLOYEES" | "DEPARTMENT" | "LOCATION"; refId: string | null; label: string | null }> | null;
  newerVersionAvailable: boolean | null;
  unpublishReason: string | null;
}

export interface LinkedDocumentListParams {
  cursor?: string;
  limit?: number;
  status?: LinkedDocumentStatus | "all";
  q?: string;
}

export interface LinkedDocumentList {
  data: LinkedDocumentItem[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export function useLinkedDocuments(params?: LinkedDocumentListParams, options?: { enabled?: boolean }) {
  const queryParams: Record<string, unknown> = {
    limit: params?.limit ?? 30,
    ...(params?.cursor ? { cursor: params.cursor } : {}),
    ...(params?.status && params.status !== "active" ? { status: params.status } : {}),
    ...(params?.q ? { q: params.q } : {}),
  };
  return useGatedQuery("kb:pages:view", {
    queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocuments(queryParams),
    queryFn: ({ signal }) => apiClient.get<LinkedDocumentList>("/kb/linked-documents", queryParams, signal, listLazy),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: false,
    throwOnError: readErrorExceptNotFoundReachesBoundary,
    ...options,
  });
}

export function useLinkedDocument(linkedDocumentId: number, options?: { enabled?: boolean }) {
  return useGatedQuery("kb:pages:view", {
    queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocument(linkedDocumentId),
    queryFn: ({ signal }) => apiClient.get<LinkedDocumentDetail>(`/kb/linked-documents/${linkedDocumentId}`, undefined, signal, detailLazy),
    staleTime: 60_000,
    retry: false,
    throwOnError: readErrorExceptNotFoundReachesBoundary,
    ...options,
  });
}

export function useOpenLinkedDocument() {
  return useMutation({
    mutationKey: ["kb", "linkedDocuments", "open"],
    gcTime: 0,
    mutationFn: (linkedDocumentId: number) =>
      apiClient.post<{ url: string; fileName: string; expiresIn: number }>(`/kb/linked-documents/${linkedDocumentId}/open`, undefined, undefined, openLazy),
  });
}
