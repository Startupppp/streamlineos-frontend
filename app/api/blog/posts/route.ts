import { type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { ok, withAbility, parseBody } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { CacheTag } from "@/lib/api/cache-tags";
import { blogDb } from "@/lib/blog-db";
import { blogPosts } from "@/lib/db/schema";
import { getAdminPosts } from "@/server/queries/blog";
import { calcReadingTime } from "@/lib/blog-utils";
import { postCreateSchema, ensureUniqueSlug } from "@/lib/blog/post-write";

export async function GET() {
  return withAbility("manage", "blog:posts", async () => {
    const data = await cached(
      "blog:admin:posts",
      () => getAdminPosts(),
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "blog:posts", async () => {
    const body = await parseBody(req, postCreateSchema);
    const slug = await ensureUniqueSlug(body.slug || body.title);

    const companyAuthor = await blogDb.query.blogAuthors.findFirst({
      columns: { id: true },
    });

    const [created] = await blogDb
      .insert(blogPosts)
      .values({
        title: body.title,
        slug,
        excerpt: body.excerpt,
        content: body.content,
        contentJson: body.contentJson ?? null,
        coverImage: body.coverImage,
        categoryId: body.categoryId ?? null,
        authorId: body.authorId ?? companyAuthor?.id ?? null,
        status: body.status,
        isFeatured: body.isFeatured,
        readingTime: calcReadingTime(body.content),
        metaTitle: body.metaTitle ?? null,
        metaDescription: body.metaDescription ?? null,
        tags: body.tags,
        publishedAt: body.status === "published" ? new Date() : null,
      })
      .returning();

    await invalidateCachePattern("blog:admin:posts*");
    revalidateTag(CacheTag.blogPosts, "default");

    return ok(created, 201);
  });
}
