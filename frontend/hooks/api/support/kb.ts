"use client";

import { useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { z } from "zod";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  kbCategoryRowContract,
  kbArticleRowContract,
  kbArticleDetailContract,
  kbFeedbackRowContract,
} from "./support-kb-schema";

const kbCategoryListC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbCategoryListContract),
);
const kbCategoryRowC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbCategoryRowContract),
);
const kbArticleListC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbArticleListContract),
);
const kbArticleRowC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbArticleRowContract),
);
const kbArticleDetailC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbArticleDetailContract),
);
const kbFeedbackListC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbFeedbackListContract),
);
const kbSuccessC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbSuccessContract),
);
const kbPublicFeedbackC = lazyContract(() =>
  import("./support-kb-schema").then((m) => m.kbPublicFeedbackContract),
);

export type KbArticleStatus = "draft" | "in_review" | "published" | "archived";
export type KbArticleVisibility = "public" | "internal";

export type KbCategory = z.infer<typeof kbCategoryRowContract>;
export type KbArticleListItem = z.infer<typeof kbArticleRowContract>;
export type KbArticleDetail = z.infer<typeof kbArticleDetailContract>;
type KbArticleFeedbackItem = z.infer<typeof kbFeedbackRowContract>;

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

interface SubmitKbFeedbackInput {
  orgId: string;
  slug: string;
  helpful: boolean;
  comment?: string;
  visitorId?: string;
}

export function useSupportKbCategories(options?: { enabled?: boolean }) {
  return useGatedQuery("support:kb:view", {
    queryKey: accountingAndSupportQueryKeys.supportKb.categories(),
    queryFn: ({ signal }) => apiClient.get<KbCategory[]>("/support/kb/categories", undefined, signal, kbCategoryListC),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateSupportKbCategory() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKb", "categories", "create"],
    mutationFn: (input: CreateKbCategoryInput) =>
      apiClient.post<KbCategory>("/support/kb/categories", input, undefined, kbCategoryRowC),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.supportKb.categories() }),
  });
}

export function useUpdateSupportKbCategory() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKb", "categories", "update"],
    mutationFn: ({ id, ...input }: UpdateKbCategoryInput & { id: number }) =>
      apiClient.patch<KbCategory>(`/support/kb/categories/${id}`, input, undefined, kbCategoryRowC),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.supportKb.categories() }),
  });
}

export function useDeleteSupportKbCategory() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKb", "categories", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/support/kb/categories/${id}`, undefined, undefined, kbSuccessC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.supportKb.categories() });
      qc.invalidateQueries({ queryKey: [...accountingAndSupportQueryKeys.supportKb.all, "articles"] });
    },
  });
}

export function useSupportKbArticles(params?: KbArticlesParams, options?: { enabled?: boolean }) {
  const queryParams: Record<string, unknown> = { ...params };
  return useGatedQuery("support:kb:view", {
    queryKey: accountingAndSupportQueryKeys.supportKb.articles(queryParams),
    queryFn: ({ signal }) => apiClient.get<KbArticleListItem[]>("/support/kb/articles", queryParams, signal, kbArticleListC),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useSupportKbArticle(id: number) {
  return useGatedQuery("support:kb:view", {
    queryKey: accountingAndSupportQueryKeys.supportKb.article(id),
    queryFn: ({ signal }) => apiClient.get<KbArticleDetail>(`/support/kb/articles/${id}`, undefined, signal, kbArticleDetailC),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 15_000,
  });
}

export function useSupportKbArticleFeedback(id: number) {
  return useGatedQuery("support:kb:view", {
    queryKey: [...accountingAndSupportQueryKeys.supportKb.article(id), "feedback"] as const,
    queryFn: ({ signal }) => apiClient.get<KbArticleFeedbackItem[]>(`/support/kb/articles/${id}/feedback`, undefined, signal, kbFeedbackListC),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  });
}

export function useCreateSupportKbArticle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKb", "articles", "create"],
    mutationFn: (input: CreateKbArticleInput) =>
      apiClient.post<KbArticleListItem>("/support/kb/articles", input, undefined, kbArticleRowC),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...accountingAndSupportQueryKeys.supportKb.all, "articles"] }),
  });
}

export function useUpdateSupportKbArticle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKb", "articles", "update"],
    mutationFn: ({ id, ...input }: UpdateKbArticleInput & { id: number }) =>
      apiClient.patch<KbArticleListItem>(`/support/kb/articles/${id}`, input, undefined, kbArticleRowC),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: [...accountingAndSupportQueryKeys.supportKb.all, "articles"] });
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.supportKb.article(variables.id) });
    },
  });
}

export function useDeleteSupportKbArticle() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:kb:manage", {
    mutationKey: ["supportKb", "articles", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/support/kb/articles/${id}`, undefined, undefined, kbSuccessC),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...accountingAndSupportQueryKeys.supportKb.all, "articles"] }),
  });
}

export function useSubmitSupportKbFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["supportKb", "feedback", "submit"],
    mutationFn: ({ orgId, slug, ...body }: SubmitKbFeedbackInput) =>
      apiClient.post<{ success: boolean; recorded: boolean }>(
        `/public/kb/${slug}/feedback?org=${encodeURIComponent(orgId)}`,
        body,
        undefined,
        kbPublicFeedbackC,
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.supportKb.publicArticle(variables.orgId, variables.slug) });
    },
  });
}
