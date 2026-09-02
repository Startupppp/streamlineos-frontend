"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface KbArticleComment {
  id: number;
  articleId: number;
  body: string;
  userId: string | null;
  userName: string | null;
  userImage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export function useSupportKbComments(articleId: number) {
  return useQuery({
    queryKey: queryKeys.kbComments.list(articleId),
    queryFn: ({ signal }) =>
      apiClient.get<KbArticleComment[]>(
        `/support/kb/articles/${articleId}/comments`
      , undefined, signal),
    enabled: Number.isFinite(articleId) && articleId > 0,
    staleTime: 30_000,
  });
}

export function useAddSupportKbComment(articleId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKbComments", "add"],
    mutationFn: (body: string) =>
      apiClient.post<KbArticleComment>(
        `/support/kb/articles/${articleId}/comments`,
        { body }
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.kbComments.list(articleId) }),
  });
}

export function useDeleteSupportKbComment(articleId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKbComments", "delete"],
    mutationFn: (commentId: number) =>
      apiClient.delete<{ success: boolean }>(
        `/support/kb/articles/${articleId}/comments/${commentId}`
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.kbComments.list(articleId) }),
  });
}
