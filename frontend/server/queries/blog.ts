"server-only";

import { blogDb } from "@/lib/blog-db";
import { blogPosts, blogCategories } from "@/lib/db/schema";
import { and, asc, desc, eq, gt, lt, ne } from "drizzle-orm";
import { serverPublicFetch } from "@/lib/api/server-client";
import type { BlogPostWithRelations, CategoryWithCount } from "@/types/blog";

export interface PostListOptions {
  limit?: number;
  cursor?: string | null;
  categorySlug?: string;
  tag?: string;
  search?: string;
}

interface BackendPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  contentJson: Record<string, unknown> | null;
  coverImage: string;
  status: "draft" | "published" | "archived";
  isFeatured: boolean;
  readingTime: number | null;
  tags: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  categoryId: string | null;
  authorId: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    description: string | null;
    createdAt: string;
  } | null;
  author: {
    id: string;
    name: string;
    bio: string | null;
    avatar: string | null;
    email: string | null;
    role: string | null;
    twitter: string | null;
    linkedin: string | null;
    createdAt: string;
  } | null;
}

function transformPost(post: BackendPost): BlogPostWithRelations {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    contentJson: post.contentJson,
    coverImage: post.coverImage,
    status: post.status,
    isFeatured: post.isFeatured,
    readingTime: post.readingTime,
    tags: post.tags,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
    updatedAt: new Date(post.updatedAt),
    createdAt: new Date(post.createdAt),
    categoryId: post.categoryId,
    authorId: post.authorId,
    category: post.category
      ? {
          id: post.category.id,
          name: post.category.name,
          slug: post.category.slug,
          color: post.category.color,
          description: post.category.description,
          createdAt: new Date(post.category.createdAt),
        }
      : null,
    author: post.author
      ? {
          id: post.author.id,
          name: post.author.name,
          bio: post.author.bio,
          avatar: post.author.avatar,
          email: post.author.email,
          role: post.author.role,
          twitter: post.author.twitter,
          linkedin: post.author.linkedin,
          createdAt: new Date(post.author.createdAt),
        }
      : null,
  };
}

export async function getPublishedPosts(opts: PostListOptions = {}) {
  const response = await serverPublicFetch.get<{
    posts: BackendPost[];
    nextCursor: string | null;
    hasMore: boolean;
  }>("/blog/feed", {
    limit: opts.limit ?? 9,
    cursor: opts.cursor,
    category: opts.categorySlug,
    tag: opts.tag,
    search: opts.search,
  });

  return {
    posts: response.posts.map(transformPost),
    nextCursor: response.nextCursor,
    hasMore: response.hasMore,
  };
}

export type PostWithRelations = BlogPostWithRelations;

export async function getFeaturedPosts(limit = 1) {
  return blogDb.query.blogPosts.findMany({
    where: and(eq(blogPosts.status, "published"), eq(blogPosts.isFeatured, true)),
    with: { category: true, author: true },
    orderBy: [desc(blogPosts.publishedAt)],
    limit,
  });
}

export async function getPostBySlug(slug: string) {
  const post = await blogDb.query.blogPosts.findFirst({
    where: and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")),
    with: { category: true, author: true },
  });
  return post ?? null;
}

export async function getCategories() {
  return serverPublicFetch.get<CategoryWithCount[]>("/blog/categories");
}

export async function getCategoryBySlug(slug: string) {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function getRelatedPosts(opts: {
  postId: string;
  categoryId: string | null;
  limit?: number;
}) {
  const limit = opts.limit ?? 3;

  if (!opts.categoryId) {
    return blogDb.query.blogPosts.findMany({
      where: and(eq(blogPosts.status, "published"), ne(blogPosts.id, opts.postId)),
      with: { category: true, author: true },
      orderBy: [desc(blogPosts.publishedAt)],
      limit,
    });
  }

  const category = await blogDb.query.blogCategories.findFirst({
    where: eq(blogCategories.id, opts.categoryId),
  });

  if (!category) {
    return blogDb.query.blogPosts.findMany({
      where: and(eq(blogPosts.status, "published"), ne(blogPosts.id, opts.postId)),
      with: { category: true, author: true },
      orderBy: [desc(blogPosts.publishedAt)],
      limit,
    });
  }

  const response = await serverPublicFetch.get<{
    posts: BackendPost[];
    nextCursor: string | null;
    hasMore: boolean;
  }>("/blog/feed", {
    category: category.slug,
    limit,
  });

  return response.posts
    .map(transformPost)
    .filter((post) => post.id !== opts.postId)
    .slice(0, limit);
}

export async function getAdjacentPosts(publishedAt: Date | null) {
  if (!publishedAt) return { prev: null, next: null };

  const [prev] = await blogDb.query.blogPosts.findMany({
    where: and(
      eq(blogPosts.status, "published"),
      lt(blogPosts.publishedAt, publishedAt),
    ),
    orderBy: [desc(blogPosts.publishedAt)],
    limit: 1,
    columns: { slug: true, title: true },
  });

  const [next] = await blogDb.query.blogPosts.findMany({
    where: and(
      eq(blogPosts.status, "published"),
      gt(blogPosts.publishedAt, publishedAt),
    ),
    orderBy: [asc(blogPosts.publishedAt)],
    limit: 1,
    columns: { slug: true, title: true },
  });

  return { prev: prev ?? null, next: next ?? null };
}

export async function getAdminPosts() {
  return blogDb.query.blogPosts.findMany({
    with: { category: true, author: true },
    orderBy: [desc(blogPosts.updatedAt)],
  });
}

export async function getAdminPostById(id: string) {
  return (
    (await blogDb.query.blogPosts.findFirst({
      where: eq(blogPosts.id, id),
      with: { category: true, author: true },
    })) ?? null
  );
}
