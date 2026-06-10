"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  BlogPostWithRelations,
  CategoryWithCount,
  PostPayload,
  CategoryPayload,
  BlogCategory,
  BlogPost,
} from "@/types/blog";

export const blogKeys = {
  all: ["blog"] as const,
  posts: () => [...blogKeys.all, "posts"] as const,
  post: (id: string) => [...blogKeys.all, "post", id] as const,
  categories: () => [...blogKeys.all, "categories"] as const,
};

// ── Posts ────────────────────────────────────────────────────────────────────

export function useAdminPosts() {
  return useQuery({
    queryKey: blogKeys.posts(),
    queryFn: () => apiClient.get<BlogPostWithRelations[]>("/blog/posts"),
  });
}

export function useAdminPost(id: string | undefined) {
  return useQuery({
    queryKey: blogKeys.post(id ?? ""),
    queryFn: () => apiClient.get<BlogPostWithRelations>(`/blog/posts/${id}`),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PostPayload) => apiClient.post<BlogPost>("/blog/posts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.all }),
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<PostPayload> & { id: string }) =>
      apiClient.patch<BlogPost>(`/blog/posts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.all }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/blog/posts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.all }),
  });
}

// ── Categories ───────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: blogKeys.categories(),
    queryFn: () => apiClient.get<CategoryWithCount[]>("/blog/categories"),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryPayload) =>
      apiClient.post<BlogCategory>("/blog/categories", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.categories() }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CategoryPayload> & { id: string }) =>
      apiClient.patch<BlogCategory>(`/blog/categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.categories() }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/blog/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: blogKeys.categories() }),
  });
}
