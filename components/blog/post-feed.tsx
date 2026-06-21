"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInfiniteBlogFeed } from "@/lib/api/hooks/blog";
import { BlogCard } from "./blog-card";
import { BlogCardSkeleton } from "./blog-card-skeleton";
import type { BlogPostWithRelations } from "@/types/blog";

interface PostFeedProps {
  initialPosts: BlogPostWithRelations[];
  initialCursor: string | null;
  initialHasMore: boolean;
  category?: string;
  tag?: string;
  search?: string;
  emptyMessage?: string;
}

export function PostFeed({
  initialPosts,
  initialCursor,
  initialHasMore,
  category,
  tag,
  search,
  emptyMessage = "No articles found.",
}: PostFeedProps) {
  const query = useInfiniteBlogFeed(
    { category, tag, search },
    { posts: initialPosts, nextCursor: initialCursor, hasMore: initialHasMore },
  );

  const posts = useMemo(
    () => query.data?.pages.flatMap((p) => p.posts) ?? initialPosts,
    [query.data, initialPosts],
  );

  if (query.isError) toast.error("Could not load more posts");

  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground">{emptyMessage}</p>
    );
  }

  const loading = query.isFetchingNextPage;
  const hasMore = query.hasNextPage ?? false;

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
        {loading &&
          Array.from({ length: 3 }).map((_, i) => <BlogCardSkeleton key={`s-${i}`} />)}
      </div>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => query.fetchNextPage()}
            disabled={loading}
          >
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
