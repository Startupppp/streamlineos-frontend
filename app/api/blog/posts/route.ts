import { type NextRequest } from "next/server";
import { ok, err, withBlogAdmin, parseBody } from "@/lib/api/helpers";
import { blogDb } from "@/lib/blog-db";
import { blogPosts } from "@/lib/db/schema";
import { getAdminPosts } from "@/server/queries/blog";
import { calcReadingTime } from "@/lib/blog-utils";
import { postCreateSchema, ensureUniqueSlug } from "@/lib/blog/post-write";

/** Admin: list all posts (any status), newest-updated first. */
export async function GET() {
  return withBlogAdmin(async () => {
    return ok(await getAdminPosts());
  });
}

/** Admin: create a post. */
export async function POST(req: NextRequest) {
  return withBlogAdmin(async () => {
    const body = await parseBody(req, postCreateSchema);
    const slug = await ensureUniqueSlug(body.slug || body.title);

    // Posts are authored by the company (the single blog author).
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

    return ok(created, 201);
  });
}
