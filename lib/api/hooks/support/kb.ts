"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type KbArticleStatus = "draft" | "published" | "archived";
export type KbArticleVisibility = "public" | "internal";

export interface KbCategory {
  id: number;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface KbArticleListItem {
  id: number;
  orgId: string;
  categoryId: number | null;
  title: string;
  slug: string;
  excerpt: string | null;
  status: KbArticleStatus;
  visibility: KbArticleVisibility;
  authorId: string | null;
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  tags: string[] | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface KbArticleDetail extends KbArticleListItem {
  content: string;
  category: { id: number; name: string; slug: string } | null;
}

export interface KbArticleFeedbackItem {
  id: number;
  articleId: number;
  helpful: boolean;
  comment: string | null;
  visitorId: string | null;
  createdAt: string | null;
}

export interface CreateKbCategoryInput {
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export interface UpdateKbCategoryInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
}

export interface KbArticlesParams {
  status?: KbArticleStatus;
  visibility?: KbArticleVisibility;
  categoryId?: number;
  search?: string;
}

export interface CreateKbArticleInput {
  title: string;
  categoryId?: number | null;
  excerpt?: string;
  content?: string;
  status?: KbArticleStatus;
  visibility?: KbArticleVisibility;
  tags?: string[];
}

export interface UpdateKbArticleInput {
  title?: string;
  categoryId?: number | null;
  excerpt?: string | null;
  content?: string;
  status?: KbArticleStatus;
  visibility?: KbArticleVisibility;
  tags?: string[] | null;
}

export interface PublicKbCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface PublicKbArticleListItem {
  id: number;
  categoryId: number | null;
  title: string;
  slug: string;
  excerpt: string | null;
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  tags: string[] | null;
  publishedAt: string | null;
}

export interface PublicKbResponse {
  categories: PublicKbCategory[];
  articles: PublicKbArticleListItem[];
}

export interface PublicKbArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  tags: string[] | null;
  publishedAt: string | null;
}

export interface PublicKbParams {
  categoryId?: number;
  search?: string;
}

export interface SubmitKbFeedbackInput {
  orgId: string;
  slug: string;
  helpful: boolean;
  comment?: string;
  visitorId?: string;
}

export function useKbCategories() {
  return useQuery({
    queryKey: queryKeys.kb.categories(),
    queryFn: () => apiClient.get<KbCategory[]>("/support/kb/categories"),
    staleTime: 60_000,
  });
}

export function useCreateKbCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateKbCategoryInput) =>
      apiClient.post<KbCategory>("/support/kb/categories", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.kb.categories() }),
  });
}

export function useUpdateKbCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateKbCategoryInput & { id: number }) =>
      apiClient.patch<KbCategory>(`/support/kb/categories/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.kb.categories() }),
  });
}

export function useDeleteKbCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/support/kb/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.categories() });
      qc.invalidateQueries({ queryKey: [...queryKeys.kb.all, "articles"] });
    },
  });
}

export function useKbArticles(params?: KbArticlesParams) {
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: queryKeys.kb.articles(queryParams),
    queryFn: () => apiClient.get<KbArticleListItem[]>("/support/kb/articles", queryParams),
    staleTime: 30_000,
  });
}

export function useKbArticle(id: number) {
  return useQuery({
    queryKey: queryKeys.kb.article(id),
    queryFn: () => apiClient.get<KbArticleDetail>(`/support/kb/articles/${id}`),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 15_000,
  });
}

export function useKbArticleFeedback(id: number) {
  return useQuery({
    queryKey: [...queryKeys.kb.article(id), "feedback"] as const,
    queryFn: () => apiClient.get<KbArticleFeedbackItem[]>(`/support/kb/articles/${id}/feedback`),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  });
}

export function useCreateKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateKbArticleInput) =>
      apiClient.post<KbArticleListItem>("/support/kb/articles", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.kb.all, "articles"] }),
  });
}

export function useUpdateKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateKbArticleInput & { id: number }) =>
      apiClient.patch<KbArticleListItem>(`/support/kb/articles/${id}`, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...queryKeys.kb.all, "articles"] });
      qc.invalidateQueries({ queryKey: queryKeys.kb.article(variables.id) });
    },
  });
}

export function useDeleteKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/support/kb/articles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.kb.all, "articles"] }),
  });
}

export function usePublicKb(orgId: string, params?: PublicKbParams) {
  return useQuery({
    queryKey: queryKeys.kb.publicArticles({ orgId, ...params }),
    queryFn: () =>
      apiClient.get<PublicKbResponse>("/public/kb", { org: orgId, ...params }),
    enabled: Boolean(orgId),
    staleTime: 60_000,
  });
}

export function usePublicKbArticle(orgId: string, slug: string) {
  return useQuery({
    queryKey: queryKeys.kb.publicArticle(orgId, slug),
    queryFn: () =>
      apiClient.get<PublicKbArticle>(`/public/kb/${slug}`, { org: orgId }),
    enabled: Boolean(orgId) && Boolean(slug),
    staleTime: 60_000,
  });
}

export function useSubmitKbFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, slug, ...body }: SubmitKbFeedbackInput) =>
      apiClient.post<{ success: boolean }>(
        `/public/kb/${slug}/feedback?org=${encodeURIComponent(orgId)}`,
        body,
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.publicArticle(variables.orgId, variables.slug) });
    },
  });
}
