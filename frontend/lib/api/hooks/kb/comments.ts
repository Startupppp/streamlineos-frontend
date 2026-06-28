"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { KbComment } from "@/types/kb";

export function useKbArticleComments(articleId: number) {
  return useQuery({
    queryKey: queryKeys.kb.comments(articleId),
    queryFn: () => apiClient.get<KbComment[]>(`/kb/articles/${articleId}/comments`),
    enabled: articleId > 0,
    staleTime: 30_000,
  });
}

export function useCreateKbComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, content, parentId }: { articleId: number; content: string; parentId?: number | null }) =>
      apiClient.post<KbComment>(`/kb/articles/${articleId}/comments`, { content, parentId }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.comments(variables.articleId) });
    },
  });
}

export function useDeleteKbComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId }: { commentId: number; articleId: number }) =>
      apiClient.delete<void>(`/kb/comments/${commentId}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.comments(variables.articleId) });
    },
  });
}

export function useResolveKbComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId }: { commentId: number; articleId: number }) =>
      apiClient.post<KbComment>(`/kb/comments/${commentId}/resolve`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.comments(variables.articleId) });
    },
  });
}
