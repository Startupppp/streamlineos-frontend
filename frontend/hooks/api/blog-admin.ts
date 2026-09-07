"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { useCan } from "@/hooks/api/access";
import type { BlogCategory, BlogPostStatus } from "@/types/blog";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  status: BlogPostStatus;
  isFeatured: boolean;
  readingTime: number | null;
  publishedAt: string | null;
  tags: string[];
  categoryId: string | null;
  authorId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  content: string | null;
  contentText: string | null;
  contentJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  category: BlogCategory | null;
}

const blogAdminPostListContract = lazyContract(() =>
  import("@/hooks/api/blog-schema").then((m) => m.blogAdminPostListContract),
);

const blogAdminPostContract = lazyContract(() =>
  import("@/hooks/api/blog-schema").then((m) => m.blogAdminPostContract),
);

const blogAdminCategoryListContract = lazyContract(() =>
  import("@/hooks/api/blog-schema").then((m) => m.blogAdminCategoryListContract),
);

const blogAdminCategoryContract = lazyContract(() =>
  import("@/hooks/api/blog-schema").then((m) => m.blogAdminCategoryContract),
);

const blogSuccessContract = lazyContract(() =>
  import("@/hooks/api/blog-schema").then((m) => m.blogSuccessContract),
);

export interface AdminBlogPostsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: BlogPostStatus | "all";
  categoryId?: string;
}

export function useAdminBlogPosts(params: AdminBlogPostsParams) {
  const canManage = useCan("blog:posts:manage");
  const { status, ...rest } = params;
  const queryParams: Record<string, unknown> = { ...rest };
  if (status && status !== "all") queryParams.status = status;
  return useQuery({
    queryKey: accessAndCrmQueryKeys.blogAdmin.posts(queryParams),
    queryFn: ({ signal }) => apiClient.get<AdminBlogPost[]>("/blog/admin/posts", queryParams, signal, blogAdminPostListContract),
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useAdminBlogPost(postId: string) {
  const canManage = useCan("blog:posts:manage");
  return useQuery({
    queryKey: accessAndCrmQueryKeys.blogAdmin.post(postId),
    queryFn: ({ signal }) => apiClient.get<AdminBlogPost>(`/blog/admin/posts/${postId}`, undefined, signal, blogAdminPostContract),
    staleTime: 60_000,
    enabled: canManage && !!postId,
  });
}

export interface CreateBlogPostInput {
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  contentJson?: Record<string, unknown> | null;
  categoryId?: string | null;
  authorId?: string | null;
  status?: BlogPostStatus;
  isFeatured?: boolean;
  tags?: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string;
}

export type UpdateBlogPostInput = Partial<CreateBlogPostInput>;

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useAuthorizedMutation("blog:posts:manage", {
    mutationKey: ["blog", "admin", "posts", "create"],
    mutationFn: (data: CreateBlogPostInput) =>
      apiClient.post<AdminBlogPost>("/blog/admin/posts", data, undefined, blogAdminPostContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.blogAdmin.all });
    },
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useAuthorizedMutation("blog:posts:manage", {
    mutationKey: ["blog", "admin", "posts", "update"],
    mutationFn: ({ postId, ...data }: { postId: string } & UpdateBlogPostInput) =>
      apiClient.patch<AdminBlogPost>(`/blog/admin/posts/${postId}`, data, undefined, blogAdminPostContract),
    onSuccess: (_, { postId }) => {
      void qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.blogAdmin.all });
      void qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.blogAdmin.post(postId), exact: true });
    },
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useAuthorizedMutation("blog:posts:manage", {
    mutationKey: ["blog", "admin", "posts", "delete"],
    mutationFn: (postId: string) => apiClient.delete<{ success: true }>(`/blog/admin/posts/${postId}`, undefined, undefined, blogSuccessContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.blogAdmin.all });
    },
  });
}

export interface AdminBlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  postCount: number;
  createdAt: string;
}

export function useAdminBlogCategories() {
  const canManage = useCan("blog:categories:manage");
  return useQuery({
    queryKey: accessAndCrmQueryKeys.blogAdmin.categories(),
    queryFn: ({ signal }) => apiClient.get<AdminBlogCategory[]>("/blog/admin/categories", undefined, signal, blogAdminCategoryListContract),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export interface CreateBlogCategoryInput {
  name: string;
  description?: string | null;
  color?: string | null;
}

export type UpdateBlogCategoryInput = Partial<CreateBlogCategoryInput>;

export function useCreateBlogCategory() {
  const qc = useQueryClient();
  return useAuthorizedMutation("blog:categories:manage", {
    mutationKey: ["blog", "admin", "categories", "create"],
    mutationFn: (data: CreateBlogCategoryInput) =>
      apiClient.post<AdminBlogCategory>("/blog/admin/categories", data, undefined, blogAdminCategoryContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.blogAdmin.categories() });
    },
  });
}

export function useUpdateBlogCategory() {
  const qc = useQueryClient();
  return useAuthorizedMutation("blog:categories:manage", {
    mutationKey: ["blog", "admin", "categories", "update"],
    mutationFn: ({ categoryId, ...data }: { categoryId: string } & UpdateBlogCategoryInput) =>
      apiClient.patch<AdminBlogCategory>(`/blog/admin/categories/${categoryId}`, data, undefined, blogAdminCategoryContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.blogAdmin.categories() });
    },
  });
}

export function useDeleteBlogCategory() {
  const qc = useQueryClient();
  return useAuthorizedMutation("blog:categories:manage", {
    mutationKey: ["blog", "admin", "categories", "delete"],
    mutationFn: (categoryId: string) =>
      apiClient.delete<{ success: true }>(`/blog/admin/categories/${categoryId}`, undefined, undefined, blogSuccessContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.blogAdmin.all });
    },
  });
}
