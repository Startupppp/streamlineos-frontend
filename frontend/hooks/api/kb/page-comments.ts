"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export type KbPageComment = {
  id: number;
  orgId: string;
  pageId: number;
  authorId: string | null;
  authorName: string | null;
  parentId: number | null;
  content: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateKbPageCommentInput = {
  content: string;
  parentId?: number | null;
};

export function useKbPageComments(pageId: number) {
  const canUpdatePages = useCan("kb:pages:update");
  return useQuery({
    queryKey: queryKeys.kb.pageComments(pageId),
    queryFn: () => apiClient.get<KbPageComment[]>(`/kb/pages/${pageId}/comments`),
    staleTime: 30_000,
    enabled: canUpdatePages && pageId > 0,
  });
}

export function useCreateKbPageComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pageComments", "create"],
    mutationFn: ({ pageId, ...data }: CreateKbPageCommentInput & { pageId: number }) =>
      apiClient.post<KbPageComment>(`/kb/pages/${pageId}/comments`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageComments(variables.pageId) });
    },
  });
}

export function useUpdateKbPageComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pageComments", "update"],
    mutationFn: ({ commentId, content }: { commentId: number; pageId: number; content: string }) =>
      apiClient.patch<KbPageComment>(`/kb/page-comments/${commentId}`, { content }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageComments(variables.pageId) });
    },
  });
}

export function useDeleteKbPageComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pageComments", "delete"],
    mutationFn: ({ commentId }: { commentId: number; pageId: number }) =>
      apiClient.delete<void>(`/kb/page-comments/${commentId}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageComments(variables.pageId) });
    },
  });
}

export function useResolveKbPageComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pageComments", "resolve"],
    mutationFn: ({ commentId }: { commentId: number; pageId: number }) =>
      apiClient.post<KbPageComment>(`/kb/page-comments/${commentId}/resolve`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageComments(variables.pageId) });
    },
  });
}
