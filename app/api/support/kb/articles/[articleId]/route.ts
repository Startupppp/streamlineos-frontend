import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbArticles } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { slugify } from "@/lib/format-utils";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  excerpt: z.string().max(500).nullable().optional(),
  content: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  visibility: z.enum(["public", "internal"]).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).nullable().optional(),
});

type RouteContext = { params: Promise<{ articleId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("view", "support:kb", async (session) => {
    const { articleId: idStr } = await ctx.params;
    const articleId = Number(idStr);
    if (!Number.isFinite(articleId)) return err("Invalid article ID", 400);

    const article = await db.query.kbArticles.findFirst({
      where: and(eq(kbArticles.id, articleId), eq(kbArticles.orgId, session.orgId)),
      with: { category: { columns: { id: true, name: true, slug: true } } },
    });
    if (!article) return err("Article not found", 404);
    return ok(article);
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "support:kb", async (session) => {
    const { articleId: idStr } = await ctx.params;
    const articleId = Number(idStr);
    if (!Number.isFinite(articleId)) return err("Invalid article ID", 400);

    const input = await parseBody(req, updateSchema);

    const current = await db.query.kbArticles.findFirst({
      where: and(eq(kbArticles.id, articleId), eq(kbArticles.orgId, session.orgId)),
      columns: { id: true, slug: true, status: true, publishedAt: true },
    });
    if (!current) return err("Article not found", 404);

    const values: Partial<typeof kbArticles.$inferInsert> = {
      categoryId: input.categoryId,
      excerpt: input.excerpt,
      content: input.content,
      visibility: input.visibility,
      tags: input.tags,
    };

    if (input.title !== undefined) {
      values.title = input.title;
      const slug = slugify(input.title);
      if (slug && slug !== current.slug) {
        const clash = await db.query.kbArticles.findFirst({
          where: and(
            eq(kbArticles.orgId, session.orgId),
            eq(kbArticles.slug, slug),
            ne(kbArticles.id, articleId),
          ),
          columns: { id: true },
        });
        if (!clash) values.slug = slug;
      }
    }

    if (input.status !== undefined) {
      values.status = input.status;
      if (input.status === "published" && !current.publishedAt) {
        values.publishedAt = new Date();
      }
    }

    const [updated] = await db
      .update(kbArticles)
      .set(values)
      .where(and(eq(kbArticles.id, articleId), eq(kbArticles.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Article not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "support:kb", async (session) => {
    const { articleId: idStr } = await ctx.params;
    const articleId = Number(idStr);
    if (!Number.isFinite(articleId)) return err("Invalid article ID", 400);

    const [deleted] = await db
      .delete(kbArticles)
      .where(and(eq(kbArticles.id, articleId), eq(kbArticles.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Article not found", 404);
    return ok({ success: true });
  });
}
