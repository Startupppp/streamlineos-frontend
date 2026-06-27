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

export function useKbArticle(articleId: number) {
  return useQuery({
    queryKey: queryKeys.kb.article(articleId),
    queryFn: () => apiClient.get<KbArticle>(`/kb/articles/${articleId}`),
    enabled: Number.isFinite(articleId) && articleId > 0,
    staleTime: 60_000,
  });
}

export function useKbArticleVersions(articleId: number) {
  return useQuery({
    queryKey: queryKeys.kb.articleVersions(articleId),
    queryFn: () => apiClient.get<KbArticleVersion[]>(`/kb/articles/${articleId}/versions`),
    enabled: Number.isFinite(articleId) && articleId > 0,
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
    mutationFn: ({ articleId, ...data }: UpdateArticleInput) =>
      apiClient.patch<KbArticle>(`/kb/articles/${articleId}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(variables.articleId) });
    },
  });
}

export function useDeleteKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (articleId: number) => apiClient.delete<{ success: boolean }>(`/kb/articles/${articleId}`),
    onSuccess: (_data, articleId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(articleId) });
    },
  });
}

export function usePublishKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (articleId: number) => apiClient.post<KbArticle>(`/kb/articles/${articleId}/publish`),
    onSuccess: (_data, articleId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(articleId) });
    },
  });
}

export function useUnpublishKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (articleId: number) => apiClient.post<KbArticle>(`/kb/articles/${articleId}/unpublish`),
    onSuccess: (_data, articleId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(articleId) });
    },
  });
}

export function useVerifyKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, ...data }: VerifyArticleInput) =>
      apiClient.post<KbArticle>(`/kb/articles/${articleId}/verify`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(variables.articleId) });
    },
  });
}

export function useVoteKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, ...data }: VoteArticleInput) =>
      apiClient.post<KbArticle>(`/kb/articles/${articleId}/vote`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(variables.articleId) });
    },
  });
}

export function useRestoreKbArticleVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, versionNumber }: { articleId: number; versionNumber: number }) =>
      apiClient.post<KbArticle>(`/kb/articles/${articleId}/versions/${versionNumber}/restore`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.articles() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(variables.articleId) });
      qc.invalidateQueries({ queryKey: queryKeys.kb.articleVersions(variables.articleId) });
    },
  });
}
