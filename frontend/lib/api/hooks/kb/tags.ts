"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface KbTag {
  id: number;
  orgId: string;
  name: string;
  slug: string;
  createdAt: string;
}

export function useKbTags() {
  return useQuery({
    queryKey: ["streamlineos", "kb", "tags"],
    queryFn: () => apiClient.get<KbTag[]>("/kb/tags"),
    staleTime: 60_000,
  });
}

export function useCreateKbTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient.post<KbTag>("/kb/tags", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["streamlineos", "kb", "tags"] }),
  });
}

export function useDeleteKbTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagId: number) => apiClient.delete<void>(`/kb/tags/${tagId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["streamlineos", "kb", "tags"] }),
  });
}

export function useKbArticleTags(articleId: number) {
  return useQuery({
    queryKey: ["streamlineos", "kb", "articleTags", articleId],
    queryFn: () => apiClient.get<KbTag[]>(`/kb/articles/${articleId}/tags`),
    enabled: articleId > 0,
    staleTime: 30_000,
  });
}

export function useSetKbArticleTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, tagIds }: { articleId: number; tagIds: number[] }) =>
      apiClient.put<KbTag[]>(`/kb/articles/${articleId}/tags`, { tagIds }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["streamlineos", "kb", "articleTags", variables.articleId] });
      qc.invalidateQueries({ queryKey: ["streamlineos", "kb", "article", variables.articleId] });
    },
  });
}
