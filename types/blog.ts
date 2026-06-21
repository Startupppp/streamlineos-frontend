import type { BlogPost, BlogCategory, BlogAuthor } from "@/lib/db/schema";

export type { BlogPost, BlogCategory, BlogAuthor };

export type BlogPostWithRelations = BlogPost & {
  category: BlogCategory | null;
  author: BlogAuthor | null;
};

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

export interface FeedResponse {
  posts: BlogPostWithRelations[];
  nextCursor: string | null;
  hasMore: boolean;
}
