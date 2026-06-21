"server-only";

import { blogDb } from "@/lib/blog-db";
import { blogPosts, blogCategories } from "@/lib/db/schema";
import { and, asc, desc, eq, gt, lt, ne, sql, count } from "drizzle-orm";

export interface PostListOptions {
  limit?: number;

  cursor?: string | null;
  categorySlug?: string;
  tag?: string;
  search?: string;
}

const POST_WITH = { category: true, author: true } as const;

export async function getPublishedPosts(opts: PostListOptions = {}) {
  const limit = Math.min(opts.limit ?? 9, 50);

  const conditions = [eq(blogPosts.status, "published")];

  if (opts.categorySlug) {
    const category = await blogDb.query.blogCategories.findFirst({
      where: eq(blogCategories.slug, opts.categorySlug),
    });
    if (!category) return { posts: [], nextCursor: null, hasMore: false };
    conditions.push(eq(blogPosts.categoryId, category.id));
  }

  if (opts.tag) {
    conditions.push(sql`${opts.tag} = ANY(${blogPosts.tags})`);
  }

  if (opts.search) {
    const term = `%${opts.search}%`;
    conditions.push(
      sql`(${blogPosts.title} ILIKE ${term} OR ${blogPosts.excerpt} ILIKE ${term})`,
    );
  }

  if (opts.cursor) {
    const cursorDate = new Date(opts.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      conditions.push(lt(blogPosts.publishedAt, cursorDate));
    }
  }

  const rows = await blogDb.query.blogPosts.findMany({
    where: and(...conditions),
    with: POST_WITH,
    orderBy: [desc(blogPosts.publishedAt)],
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  const posts = hasMore ? rows.slice(0, limit) : rows;
  const last = posts[posts.length - 1];
  const nextCursor =
    hasMore && last?.publishedAt ? last.publishedAt.toISOString() : null;

  return { posts, nextCursor, hasMore };
}

export type PostWithRelations = Awaited<
  ReturnType<typeof getPublishedPosts>
>["posts"][number];

export async function getFeaturedPosts(limit = 1) {
  return blogDb.query.blogPosts.findMany({
    where: and(eq(blogPosts.status, "published"), eq(blogPosts.isFeatured, true)),
    with: POST_WITH,
    orderBy: [desc(blogPosts.publishedAt)],
    limit,
  });
}

export async function getPostBySlug(slug: string) {
  const post = await blogDb.query.blogPosts.findFirst({
    where: and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")),
    with: POST_WITH,
  });
  return post ?? null;
}

export async function getCategories() {
  const rows = await blogDb
    .select({
      id: blogCategories.id,
      name: blogCategories.name,
      slug: blogCategories.slug,
      color: blogCategories.color,
      description: blogCategories.description,
      count: count(blogPosts.id),
    })
    .from(blogCategories)
    .leftJoin(
      blogPosts,
      and(
        eq(blogPosts.categoryId, blogCategories.id),
        eq(blogPosts.status, "published"),
      ),
    )
    .groupBy(blogCategories.id)
    .orderBy(asc(blogCategories.name));

  return rows.map((r) => ({ ...r, count: Number(r.count) }));
}

export async function getCategoryBySlug(slug: string) {
  return (
    (await blogDb.query.blogCategories.findFirst({
      where: eq(blogCategories.slug, slug),
    })) ?? null
  );
}

export async function getRelatedPosts(opts: {
  postId: string;
  categoryId: string | null;
  limit?: number;
}) {
  const limit = opts.limit ?? 3;
  const conditions = [
    eq(blogPosts.status, "published"),
    ne(blogPosts.id, opts.postId),
  ];
  if (opts.categoryId) conditions.push(eq(blogPosts.categoryId, opts.categoryId));

  return blogDb.query.blogPosts.findMany({
    where: and(...conditions),
    with: POST_WITH,
    orderBy: [desc(blogPosts.publishedAt)],
    limit,
  });
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
    with: POST_WITH,
    orderBy: [desc(blogPosts.updatedAt)],
  });
}

export async function getAdminPostById(id: string) {
  return (
    (await blogDb.query.blogPosts.findFirst({
      where: eq(blogPosts.id, id),
      with: POST_WITH,
    })) ?? null
  );
}
