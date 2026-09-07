"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import type {
  BlogPostWithRelations,
  FeedResponse,
} from "@/types/blog";

const blogFeedContract = lazyContract(() =>
  import("@/hooks/api/blog-schema").then((m) => m.blogFeedContract),
);

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
    queryKey: accessAndCrmQueryKeys.blog.feed(params),
    queryFn: ({ pageParam , signal }) => {
      const query: Record<string, unknown> = {};
      if (pageParam !== null) query.cursor = pageParam;
      if (params.category) query.category = params.category;
      if (params.tag) query.tag = params.tag;
      if (params.search) query.search = params.search;
      if (params.limit) query.limit = params.limit;
      return apiClient.get<FeedResponse>("/blog/feed", query, signal, blogFeedContract);
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

