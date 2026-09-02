"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

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
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface RichDocumentListParams {
  page?: number;
  limit?: number;
  isPublished?: boolean;
}

const richDocKeys = {
  all: [...queryKeys.hr.all, "richDocuments"] as const,
  lists: () => [...richDocKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) => [...richDocKeys.all, "list", params] as const,
  detail: (documentId: number) =>
    [...richDocKeys.all, "detail", documentId] as const,
};

export function useRichDocuments(params?: RichDocumentListParams) {
  const canView = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  const queryParams: Record<string, unknown> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    ...(params?.isPublished !== undefined ? { isPublished: String(params.isPublished) } : {}),
  };
  return useQuery({
    queryKey: richDocKeys.list(queryParams),
    queryFn: ({ signal }) => apiClient.get<RichDocumentListResponse>("/hr/rich-documents", queryParams, signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: hrEnabled && canView,
  });
}

export function useRichDocument(documentId: number) {
  const canView = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: richDocKeys.detail(documentId),
    queryFn: ({ signal }) =>
      apiClient.get<RichDocument>(`/hr/rich-documents/${documentId}`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && documentId > 0 && canView,
  });
}

export function useCreateRichDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "rich-documents", "create"],
    mutationFn: (data: { title: string; templateType?: string; contentJson?: unknown }) =>
      apiClient.post<RichDocument>("/hr/rich-documents", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: richDocKeys.lists() }),
  });
}

export function useUpdateRichDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "rich-documents", "update"],
    mutationFn: ({ documentId, ...data }: { documentId: number; title?: string; contentJson?: unknown }) =>
      apiClient.patch<{ success: boolean }>(`/hr/rich-documents/${documentId}`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: richDocKeys.lists() });
      qc.invalidateQueries({ queryKey: richDocKeys.detail(variables.documentId) });
    },
  });
}

export function useDeleteRichDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "rich-documents", "delete"],
    mutationFn: (documentId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/rich-documents/${documentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: richDocKeys.lists() }),
  });
}

export function usePublishRichDocument() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "rich-documents", "publish"],
    mutationFn: (documentId: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/rich-documents/${documentId}/publish`),
    onSuccess: (_, documentId) => {
      qc.invalidateQueries({ queryKey: richDocKeys.lists() });
      qc.invalidateQueries({ queryKey: richDocKeys.detail(documentId) });
    },
  });
}
