import type { BlogPost, BlogCategory, BlogAuthor } from "@/lib/db/schema";

export type { BlogPost, BlogCategory, BlogAuthor };

/** A post joined with its category and author (the shape the API returns). */
export type BlogPostWithRelations = BlogPost & {
  category: BlogCategory | null;
  author: BlogAuthor | null;
};

/** Category plus its published-post count (from /api/blog/categories). */
export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  description: string | null;
  count: number;
}

export interface TagWithCount {
  tag: string;
  count: number;
}

export type BlogPostStatus = "draft" | "published" | "archived";

/** Payload for creating/updating a post via the admin API. */
export interface PostPayload {
  title: string;
  excerpt: string;
  content: string;
  contentJson?: Record<string, unknown> | null;
  coverImage: string;
  categoryId?: string | null;
  authorId?: string | null;
  status: BlogPostStatus;
  isFeatured: boolean;
  tags: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string;
}

export interface CategoryPayload {
  name: string;
  description?: string | null;
  color?: string | null;
}

/** Paginated feed response from /api/blog/feed. */
export interface FeedResponse {
  posts: BlogPostWithRelations[];
  nextCursor: string | null;
  hasMore: boolean;
}
