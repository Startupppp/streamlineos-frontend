"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  BlogPostWithRelations,
  CategoryWithCount,
  FeedResponse,
  PostPayload,
  CategoryPayload,
  BlogCategory,
  BlogPost,
} from "@/types/blog";

const blogKeys = {
  all: ["blog"] as const,
  posts: () => [...blogKeys.all, "posts"] as const,
  post: (id: string) => [...blogKeys.all, "post", id] as const,
  categories: () => [...blogKeys.all, "categories"] as const,
};

interface BlogFeedParams {
  category?: string;
  tag?: string;
  search?: string;
  limit?: number;
}

export function useInfiniteBlogFeed(
  params: BlogFeedParams,
  initial?: { posts: BlogPostWithRelations[]; nextCursor: string | null; hasMore: boolean },
) {
  return useInfiniteQuery<FeedResponse, Error>({
    queryKey: queryKeys.blog.feed(params),
    queryFn: ({ pageParam }) => {
      const query: Record<string, unknown> = {};
      if (pageParam) query.cursor = pageParam;
      if (params.category) query.category = params.category;
      if (params.tag) query.tag = params.tag;
      if (params.search) query.search = params.search;
      if (params.limit) query.limit = params.limit;
      return apiClient.get<FeedResponse>("/blog/feed", query);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    initialData: initial
      ? {
          pages: [{ posts: initial.posts, nextCursor: initial.nextCursor, hasMore: initial.hasMore }],
          pageParams: [null],
        }
      : undefined,
    staleTime: 60_000,
  });
}

// ── Posts ────────────────────────────────────────────────────────────────────

export function useAdminPosts() {
  return useQuery({
    queryKey: blogKeys.posts(),
    queryFn: () => apiClient.get<BlogPostWithRelations[]>("/blog/posts"),
    staleTime: 2 * 60_000,
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
    staleTime: 2 * 60_000,
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
