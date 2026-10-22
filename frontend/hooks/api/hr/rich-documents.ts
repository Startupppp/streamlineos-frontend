"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { richDocumentDetailQueryOptions } from "./rich-documents-read-options";

const richDocumentDetailC = lazyContract(() =>
  import("@/hooks/api/hr/rich-documents-schema").then((m) => m.richDocumentDetailContract),
);
const richDocumentsListC = lazyContract(() =>
  import("@/hooks/api/hr/rich-documents-schema").then((m) => m.richDocumentsListContract),
);
const createRichDocumentC = lazyContract(() =>
  import("@/hooks/api/hr/rich-documents-schema").then((m) => m.createRichDocumentContract),
);
const updateRichDocumentC = lazyContract(() =>
  import("@/hooks/api/hr/rich-documents-schema").then((m) => m.updateRichDocumentContract),
);
const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const publishRichDocumentC = lazyContract(() =>
  import("@/hooks/api/hr/rich-documents-schema").then((m) => m.publishRichDocumentContract),
);

export interface RichDocument {
  id: number;
  orgId: string;
  title: string;
  contentJson: unknown;
  templateType: string | null;
  isPublished: boolean | null;
  version: number | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export type RichDocumentListItem = Omit<RichDocument, "contentJson">;

export interface RichDocumentListResponse {
  data: RichDocumentListItem[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export interface RichDocumentListParams {
  cursor?: string;
  limit?: number;
  isPublished?: boolean;
}

export function useRichDocuments(params?: RichDocumentListParams) {
  const canView = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  const queryParams: Record<string, unknown> = {
    limit: params?.limit ?? 20,
    ...(params?.cursor ? { cursor: params.cursor } : {}),
    ...(params?.isPublished !== undefined ? { isPublished: String(params.isPublished) } : {}),
  };
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.richDocumentList(queryParams),
    queryFn: ({ signal }) =>
      apiClient.get<RichDocumentListResponse>(
        "/hr/rich-documents",
        queryParams,
        signal,
        richDocumentsListC,
      ),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: hrEnabled && canView,
    ...INLINE_READ_ERROR,
  });
}

export function useRichDocument(documentId: number) {
  const canView = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    ...richDocumentDetailQueryOptions(documentId),
    queryFn: ({ signal }) =>
      apiClient.get<RichDocument>(`/hr/rich-documents/${documentId}`, undefined, signal, richDocumentDetailC),
    enabled: hrEnabled && documentId > 0 && canView,
  });
}

export function useCreateRichDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "rich-documents", "create"],
    mutationFn: (data: { title: string; templateType?: string; contentJson?: unknown }) =>
      apiClient.post<RichDocument>("/hr/rich-documents", data, undefined, createRichDocumentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.richDocumentLists() }),
  });
}

export function useUpdateRichDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "rich-documents", "update"],
    mutationFn: ({ documentId, ...data }: { documentId: number; title?: string; contentJson?: unknown }) =>
      apiClient.patch<{ success: boolean }>(`/hr/rich-documents/${documentId}`, data, undefined, updateRichDocumentC),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.richDocumentLists() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.richDocumentDetail(variables.documentId) });
    },
  });
}

export function useDeleteRichDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "rich-documents", "delete"],
    mutationFn: (documentId: number) =>
      apiClient.delete<void>(`/hr/rich-documents/${documentId}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.richDocumentLists() }),
  });
}

export function usePublishRichDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "rich-documents", "publish"],
    mutationFn: (documentId: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/rich-documents/${documentId}/publish`, undefined, undefined, publishRichDocumentC),
    onSuccess: (_, documentId) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.richDocumentLists() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.richDocumentDetail(documentId) });
    },
  });
}
