"server-only";

import { serverApiClient, serverPublicFetch } from "@/lib/api/server-client";
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

interface AdjacentPostStub {
  slug: string;
  title: string;
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
  const response = await serverPublicFetch.get<{
    posts: BackendPost[];
    nextCursor: string | null;
    hasMore: boolean;
  }>("/blog/feed", { featured: "true", limit });

  return response.posts.map(transformPost);
}

export async function getPostBySlug(slug: string) {
  try {
    const post = await serverPublicFetch.get<BackendPost>(`/blog/by-slug/${slug}`);
    return transformPost(post);
  } catch {
    return null;
  }
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
    const response = await serverPublicFetch.get<{
      posts: BackendPost[];
      nextCursor: string | null;
      hasMore: boolean;
    }>("/blog/feed", { limit: limit + 1 });

    return response.posts
      .map(transformPost)
      .filter((post) => post.id !== opts.postId)
      .slice(0, limit);
  }

  const categories = await getCategories();
  const category = categories.find((c) => c.id === opts.categoryId);

  const response = await serverPublicFetch.get<{
    posts: BackendPost[];
    nextCursor: string | null;
    hasMore: boolean;
  }>("/blog/feed", {
    category: category?.slug,
    limit: limit + 1,
  });

  const filtered = response.posts
    .map(transformPost)
    .filter((post) => post.id !== opts.postId)
    .slice(0, limit);

  if (filtered.length >= limit) return filtered;

  const fallback = await serverPublicFetch.get<{
    posts: BackendPost[];
    nextCursor: string | null;
    hasMore: boolean;
  }>("/blog/feed", { limit: limit + 1 });

  return fallback.posts
    .map(transformPost)
    .filter((post) => post.id !== opts.postId)
    .slice(0, limit);
}

export async function getAdjacentPosts(slug: string | null) {
  if (!slug) return { prev: null, next: null };

  return serverPublicFetch.get<{
    prev: AdjacentPostStub | null;
    next: AdjacentPostStub | null;
  }>(`/blog/by-slug/${slug}/adjacent`);
}

export async function getAdminPosts() {
  const posts = await serverApiClient.get<BackendPost[]>("/blog/posts");
  return posts.map(transformPost);
}

export async function getAdminPostById(id: string) {
  try {
    const post = await serverApiClient.get<BackendPost>(`/blog/posts/${id}`);
    return transformPost(post);
  } catch {
    return null;
  }
}
