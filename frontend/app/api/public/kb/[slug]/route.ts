import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbArticles, kbCategories } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({ org: z.string().min(1) });

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params;
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) return err("Invalid request", 400);
  const { org } = parsed.data;

  const [article] = await db
    .select({
      id: kbArticles.id,
      title: kbArticles.title,
      slug: kbArticles.slug,
      excerpt: kbArticles.excerpt,
      content: kbArticles.content,
      categoryId: kbArticles.categoryId,
      categoryName: kbCategories.name,
      categorySlug: kbCategories.slug,
      views: kbArticles.views,
      helpfulCount: kbArticles.helpfulCount,
      notHelpfulCount: kbArticles.notHelpfulCount,
      tags: kbArticles.tags,
      publishedAt: kbArticles.publishedAt,
    })
    .from(kbArticles)
    .leftJoin(kbCategories, eq(kbArticles.categoryId, kbCategories.id))
    .where(
      and(
        eq(kbArticles.orgId, org),
        eq(kbArticles.slug, slug),
        eq(kbArticles.status, "published"),
        eq(kbArticles.visibility, "public"),
      ),
    );

  if (!article) return err("Article not found", 404);

  await db
    .update(kbArticles)
    .set({ views: sql`${kbArticles.views} + 1` })
    .where(eq(kbArticles.id, article.id));

  return ok({ ...article, views: article.views + 1 });
}
