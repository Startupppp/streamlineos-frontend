"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { useCan } from "@/hooks/api/access";
import type { BlogCategory, BlogPostStatus } from "@/types/blog";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  status: BlogPostStatus;
  isFeatured: boolean;
  readingTime: number | null;
  publishedAt: string | null;
  tags: string[];
  categoryId: string | null;
  authorId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string;
  category: BlogCategory | null;
}

export interface AdminBlogPostsResponse {
  posts: AdminBlogPost[];
  total: number;
  page: number;
  limit: number;
}

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
    queryFn: ({ signal }) => apiClient.get<AdminBlogPostsResponse>("/blog/admin/posts", queryParams, signal),
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useAdminBlogPost(postId: string) {
  const canManage = useCan("blog:posts:manage");
  return useQuery({
    queryKey: accessAndCrmQueryKeys.blogAdmin.post(postId),
    queryFn: ({ signal }) => apiClient.get<AdminBlogPost>(`/blog/admin/posts/${postId}`, undefined, signal),
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
      apiClient.post<AdminBlogPost>("/blog/admin/posts", data),
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
      apiClient.patch<AdminBlogPost>(`/blog/admin/posts/${postId}`, data),
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
    mutationFn: (postId: string) => apiClient.delete(`/blog/admin/posts/${postId}`),
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
    queryFn: ({ signal }) => apiClient.get<AdminBlogCategory[]>("/blog/admin/categories", undefined, signal),
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
      apiClient.post<AdminBlogCategory>("/blog/admin/categories", data),
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
      apiClient.patch<AdminBlogCategory>(`/blog/admin/categories/${categoryId}`, data),
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
      apiClient.delete(`/blog/admin/categories/${categoryId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.blogAdmin.all });
    },
  });
}
