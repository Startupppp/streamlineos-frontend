"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { KbTag } from "@/types/kb";

export function useKbTags() {
  const canViewSpaces = useCan("kb:spaces:view");
  return useQuery({
    queryKey: queryKeys.kb.tags(),
    queryFn: () => apiClient.get<KbTag[]>("/kb/tags"),
    staleTime: 60_000,
    enabled: canViewSpaces,
  });
}

export function useCreateKbTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient.post<KbTag>("/kb/tags", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.kb.tags() }),
  });
}

export function useKbArticleTags(articleId: number) {
  const canViewArticles = useCan("kb:articles:view");
  return useQuery({
    queryKey: queryKeys.kb.articleTags(articleId),
    queryFn: () => apiClient.get<KbTag[]>(`/kb/articles/${articleId}/tags`),
    enabled: canViewArticles && articleId > 0,
    staleTime: 30_000,
  });
}

export function useSetKbArticleTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, tagIds }: { articleId: number; tagIds: number[] }) =>
      apiClient.put<KbTag[]>(`/kb/articles/${articleId}/tags`, { tagIds }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articleTags(variables.articleId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(variables.articleId) });
    },
  });
}
