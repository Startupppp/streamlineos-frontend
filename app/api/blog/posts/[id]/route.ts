import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { ok, err, withBlogAdmin, parseBody } from "@/lib/api/helpers";
import { blogDb } from "@/lib/blog-db";
import { blogPosts } from "@/lib/db/schema";
import { getAdminPostById } from "@/server/queries/blog";
import { calcReadingTime } from "@/lib/blog-utils";
import { postUpdateSchema, ensureUniqueSlug } from "@/lib/blog/post-write";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withBlogAdmin(async () => {
    const { id } = await params;
    const post = await getAdminPostById(id);
    if (!post) return err("Post not found", 404);
    return ok(post);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withBlogAdmin(async () => {
    const { id } = await params;
    const body = await parseBody(req, postUpdateSchema);

    const existing = await blogDb.query.blogPosts.findFirst({
      where: eq(blogPosts.id, id),
    });
    if (!existing) return err("Post not found", 404);

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.title !== undefined) updates.title = body.title;
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt;
    if (body.content !== undefined) {
      updates.content = body.content;
      updates.readingTime = calcReadingTime(body.content);
    }
    if (body.contentJson !== undefined) updates.contentJson = body.contentJson;
    if (body.coverImage !== undefined) updates.coverImage = body.coverImage;
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
    if (body.authorId !== undefined) updates.authorId = body.authorId;
    if (body.isFeatured !== undefined) updates.isFeatured = body.isFeatured;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.metaTitle !== undefined) updates.metaTitle = body.metaTitle;
    if (body.metaDescription !== undefined)
      updates.metaDescription = body.metaDescription;

    // Slug follows an explicit slug, else a changed title.
    if (body.slug) {
      updates.slug = await ensureUniqueSlug(body.slug, id);
    } else if (body.title !== undefined && body.title !== existing.title) {
      updates.slug = await ensureUniqueSlug(body.title, id);
    }

    // Stamp publishedAt the first time a post becomes published.
    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === "published" && !existing.publishedAt) {
        updates.publishedAt = new Date();
      }
    }

    const [updated] = await blogDb
      .update(blogPosts)
      .set(updates)
      .where(eq(blogPosts.id, id))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withBlogAdmin(async () => {
    const { id } = await params;
    const [deleted] = await blogDb
      .delete(blogPosts)
      .where(eq(blogPosts.id, id))
      .returning();
    if (!deleted) return err("Post not found", 404);
    return ok({ success: true });
  });
}
