"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  KbArticle,
  KbArticleVersion,
  PaginatedArticles,
  ListArticlesParams,
  CreateArticleInput,
  UpdateArticleInput,
  VerifyArticleInput,
  VoteArticleInput,
} from "@/types/kb";

export function useKbArticles(params: ListArticlesParams) {
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: queryKeys.kb.articles(queryParams),
    queryFn: () => apiClient.get<PaginatedArticles>("/kb/articles", queryParams),
    staleTime: 30_000,
  });
}

export function useKbArticle(id: number) {
  return useQuery({
    queryKey: queryKeys.kb.article(id),
    queryFn: () => apiClient.get<KbArticle>(`/kb/articles/${id}`),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 60_000,
  });
}

export function useKbArticleVersions(id: number) {
  return useQuery({
    queryKey: queryKeys.kb.articleVersions(id),
    queryFn: () => apiClient.get<KbArticleVersion[]>(`/kb/articles/${id}/versions`),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 60_000,
  });
}

export function useCreateKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateArticleInput) => apiClient.post<KbArticle>("/kb/articles", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
    },
  });
}

export function useUpdateKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateArticleInput) =>
      apiClient.patch<KbArticle>(`/kb/articles/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(variables.id) });
    },
  });
}

export function useDeleteKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/kb/articles/${id}`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(id) });
    },
  });
}

export function usePublishKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<KbArticle>(`/kb/articles/${id}/publish`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(id) });
    },
  });
}

export function useUnpublishKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<KbArticle>(`/kb/articles/${id}/unpublish`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(id) });
    },
  });
}

export function useVerifyKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: VerifyArticleInput) =>
      apiClient.post<KbArticle>(`/kb/articles/${id}/verify`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(variables.id) });
    },
  });
}

export function useVoteKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: VoteArticleInput) =>
      apiClient.post<KbArticle>(`/kb/articles/${id}/vote`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(variables.id) });
    },
  });
}

export function useRestoreKbArticleVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, versionNumber }: { id: number; versionNumber: number }) =>
      apiClient.post<KbArticle>(`/kb/articles/${id}/versions/${versionNumber}/restore`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.articleVersions(variables.id) });
    },
  });
}
