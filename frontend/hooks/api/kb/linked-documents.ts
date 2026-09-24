"use client";

import { keepPreviousData, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";

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
  /** Publisher-only: null for everyone else. */
  audiences: Array<{ kind: "ALL_EMPLOYEES" | "DEPARTMENT" | "LOCATION"; refId: string | null; label: string | null }> | null;
  newerVersionAvailable: boolean | null;
  unpublishReason: string | null;
}

export interface LinkedDocumentListParams {
  cursor?: string;
  limit?: number;
  /** Anything but "active" is for publishers; anyone else is refused with 403. */
  status?: LinkedDocumentStatus | "all";
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
  };
  return useGatedQuery("kb:pages:view", {
    queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocuments(queryParams),
    queryFn: ({ signal }) => apiClient.get<LinkedDocumentList>("/kb/linked-documents", queryParams, signal, listLazy),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    // The switch is read separately; a tenant with it off answers 404 here, which the page shows as "not found".
    retry: false,
    ...options,
  });
}

export function useLinkedDocument(linkedDocumentId: number, options?: { enabled?: boolean }) {
  return useGatedQuery("kb:pages:view", {
    queryKey: knowledgeAndSurveysQueryKeys.kb.linkedDocument(linkedDocumentId),
    queryFn: ({ signal }) => apiClient.get<LinkedDocumentDetail>(`/kb/linked-documents/${linkedDocumentId}`, undefined, signal, detailLazy),
    staleTime: 60_000,
    retry: false,
    ...options,
  });
}

/** Asks the server to authorise the entry again and sign a 300 second URL. The URL is used once and never stored. */
export function useOpenLinkedDocument() {
  return useMutation({
    mutationKey: ["kb", "linkedDocuments", "open"],
    mutationFn: (linkedDocumentId: number) =>
      apiClient.post<{ url: string; fileName: string; expiresIn: number }>(`/kb/linked-documents/${linkedDocumentId}/open`, undefined, undefined, openLazy),
  });
}
