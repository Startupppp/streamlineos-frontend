import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbCategories, kbArticles } from "@/lib/db/schema";
import { and, eq, ilike, or, asc, desc, type SQL } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  org: z.string().min(1),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) return err("Invalid request", 400);
  const { org, categoryId, search } = parsed.data;

  const categories = await db
    .select({
      id: kbCategories.id,
      name: kbCategories.name,
      slug: kbCategories.slug,
      description: kbCategories.description,
      icon: kbCategories.icon,
      sortOrder: kbCategories.sortOrder,
    })
    .from(kbCategories)
    .where(and(eq(kbCategories.orgId, org), eq(kbCategories.isPublished, true)))
    .orderBy(asc(kbCategories.sortOrder), asc(kbCategories.name));

  const conditions: SQL[] = [
    eq(kbArticles.orgId, org),
    eq(kbArticles.status, "published"),
    eq(kbArticles.visibility, "public"),
  ];
  if (categoryId) conditions.push(eq(kbArticles.categoryId, categoryId));
  if (search) {
    const term = `%${search}%`;
    const match = or(ilike(kbArticles.title, term), ilike(kbArticles.excerpt, term));
    if (match) conditions.push(match);
  }

  const articles = await db
    .select({
      id: kbArticles.id,
      categoryId: kbArticles.categoryId,
      title: kbArticles.title,
      slug: kbArticles.slug,
      excerpt: kbArticles.excerpt,
      views: kbArticles.views,
      helpfulCount: kbArticles.helpfulCount,
      notHelpfulCount: kbArticles.notHelpfulCount,
      tags: kbArticles.tags,
      publishedAt: kbArticles.publishedAt,
    })
    .from(kbArticles)
    .where(and(...conditions))
    .orderBy(desc(kbArticles.publishedAt));

  return ok({ categories, articles });
}
