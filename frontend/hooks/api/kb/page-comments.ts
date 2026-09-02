"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
  const canViewPages = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pageComments(pageId),
    queryFn: ({ signal }) => apiClient.get<KbPageComment[]>(`/kb/pages/${pageId}/comments`, undefined, signal),
    staleTime: 30_000,
    enabled: canViewPages && pageId > 0,
  });
}

export function useCreateKbPageComment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageComments", "create"],
    mutationFn: ({ pageId, ...data }: CreateKbPageCommentInput & { pageId: number }) =>
      apiClient.post<KbPageComment>(`/kb/pages/${pageId}/comments`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageComments(variables.pageId) });
    },
  });
}

export function useUpdateKbPageComment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageComments", "update"],
    mutationFn: ({ commentId, content }: { commentId: number; pageId: number; content: string }) =>
      apiClient.patch<KbPageComment>(`/kb/page-comments/${commentId}`, { content }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageComments(variables.pageId) });
    },
  });
}

export function useDeleteKbPageComment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageComments", "delete"],
    mutationFn: ({ commentId }: { commentId: number; pageId: number }) =>
      apiClient.delete<void>(`/kb/page-comments/${commentId}`),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageComments(variables.pageId) });
    },
  });
}

export function useResolveKbPageComment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pageComments", "resolve"],
    mutationFn: ({ commentId }: { commentId: number; pageId: number }) =>
      apiClient.post<KbPageComment>(`/kb/page-comments/${commentId}/resolve`),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageComments(variables.pageId) });
    },
  });
}
