"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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

interface KbArticleFeedbackItem {
  id: number;
  articleId: number;
  helpful: boolean;
  comment: string | null;
  visitorId: string | null;
  createdAt: string | null;
}

interface CreateKbCategoryInput {
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

interface UpdateKbCategoryInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
}

interface KbArticlesParams {
  status?: KbArticleStatus;
  visibility?: KbArticleVisibility;
  categoryId?: number;
  search?: string;
}

interface CreateKbArticleInput {
  title: string;
  categoryId?: number | null;
  excerpt?: string;
  content?: string;
  status?: KbArticleStatus;
  visibility?: KbArticleVisibility;
  tags?: string[];
}

interface UpdateKbArticleInput {
  title?: string;
  categoryId?: number | null;
  excerpt?: string | null;
  content?: string;
  status?: KbArticleStatus;
  visibility?: KbArticleVisibility;
  tags?: string[] | null;
}

interface PublicKbCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

interface PublicKbArticleListItem {
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

interface PublicKbResponse {
  categories: PublicKbCategory[];
  articles: PublicKbArticleListItem[];
}

interface PublicKbArticle {
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

interface PublicKbParams {
  categoryId?: number;
  search?: string;
}

interface SubmitKbFeedbackInput {
  orgId: string;
  slug: string;
  helpful: boolean;
  comment?: string;
  visitorId?: string;
}

export function useSupportKbCategories(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.supportKb.categories(),
    queryFn: () => apiClient.get<KbCategory[]>("/support/kb/categories"),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateSupportKbCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportKb", "categories", "create"],
    mutationFn: (input: CreateKbCategoryInput) =>
      apiClient.post<KbCategory>("/support/kb/categories", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportKb.categories() }),
  });
}

export function useUpdateSupportKbCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportKb", "categories", "update"],
    mutationFn: ({ id, ...input }: UpdateKbCategoryInput & { id: number }) =>
      apiClient.patch<KbCategory>(`/support/kb/categories/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportKb.categories() }),
  });
}

export function useDeleteSupportKbCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportKb", "categories", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/support/kb/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.supportKb.categories() });
      qc.invalidateQueries({ queryKey: [...queryKeys.supportKb.all, "articles"] });
    },
  });
}

export function useSupportKbArticles(params?: KbArticlesParams, options?: { enabled?: boolean }) {
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: queryKeys.supportKb.articles(queryParams),
    queryFn: () => apiClient.get<KbArticleListItem[]>("/support/kb/articles", queryParams),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useSupportKbArticle(id: number) {
  return useQuery({
    queryKey: queryKeys.supportKb.article(id),
    queryFn: () => apiClient.get<KbArticleDetail>(`/support/kb/articles/${id}`),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 15_000,
  });
}

export function useSupportKbArticleFeedback(id: number) {
  return useQuery({
    queryKey: [...queryKeys.supportKb.article(id), "feedback"] as const,
    queryFn: () => apiClient.get<KbArticleFeedbackItem[]>(`/support/kb/articles/${id}/feedback`),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  });
}

export function useCreateSupportKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportKb", "articles", "create"],
    mutationFn: (input: CreateKbArticleInput) =>
      apiClient.post<KbArticleListItem>("/support/kb/articles", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.supportKb.all, "articles"] }),
  });
}

export function useUpdateSupportKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportKb", "articles", "update"],
    mutationFn: ({ id, ...input }: UpdateKbArticleInput & { id: number }) =>
      apiClient.patch<KbArticleListItem>(`/support/kb/articles/${id}`, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...queryKeys.supportKb.all, "articles"] });
      qc.invalidateQueries({ queryKey: queryKeys.supportKb.article(variables.id) });
    },
  });
}

export function useDeleteSupportKbArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportKb", "articles", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/support/kb/articles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.supportKb.all, "articles"] }),
  });
}

export function usePublicSupportKb(orgId: string, params?: PublicKbParams) {
  return useQuery({
    queryKey: queryKeys.supportKb.publicArticles({ orgId, ...params }),
    queryFn: () =>
      apiClient.get<PublicKbResponse>("/public/kb", { org: orgId, ...params }),
    enabled: Boolean(orgId),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePublicSupportKbArticle(orgId: string, slug: string) {
  return useQuery({
    queryKey: queryKeys.supportKb.publicArticle(orgId, slug),
    queryFn: () =>
      apiClient.get<PublicKbArticle>(`/public/kb/${slug}`, { org: orgId }),
    enabled: Boolean(orgId) && Boolean(slug),
    staleTime: 60_000,
  });
}

export function useSubmitSupportKbFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportKb", "feedback", "submit"],
    mutationFn: ({ orgId, slug, ...body }: SubmitKbFeedbackInput) =>
      apiClient.post<{ success: boolean }>(
        `/public/kb/${slug}/feedback?org=${encodeURIComponent(orgId)}`,
        body,
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.supportKb.publicArticle(variables.orgId, variables.slug) });
    },
  });
}
