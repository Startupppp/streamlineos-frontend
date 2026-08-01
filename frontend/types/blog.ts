export interface BlogAuthor {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  bio: string | null;
  role: string | null;
  twitter: string | null;
  linkedin: string | null;
  createdAt: Date;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  createdAt: Date;
}

export type BlogPostStatus = "draft" | "published" | "archived";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  contentJson: Record<string, unknown> | null;
  coverImage: string;
  categoryId: string | null;
  authorId: string | null;
  status: BlogPostStatus;
  isFeatured: boolean;
  readingTime: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: Date | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

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

export interface FeedResponse {
  posts: BlogPostWithRelations[];
  nextCursor: string | null;
  hasMore: boolean;
}
