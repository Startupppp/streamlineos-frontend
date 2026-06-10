"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BlogCard } from "./blog-card";
import { BlogCardSkeleton } from "./blog-card-skeleton";
import type { BlogPostWithRelations, FeedResponse } from "@/types/blog";

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
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (category) params.set("category", category);
      if (tag) params.set("tag", tag);
      if (search) params.set("search", search);
      const res = await fetch(`/api/blog/feed?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as FeedResponse;
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      toast.error("Could not load more posts");
    } finally {
      setLoading(false);
    }
  }

  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground">{emptyMessage}</p>
    );
  }

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
          <Button variant="outline" size="lg" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
