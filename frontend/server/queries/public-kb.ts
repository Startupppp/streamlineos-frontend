"server-only";

import { cache } from "react";
import { db } from "@/lib/db";
import { kbArticles, kbCategories, organizations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export interface PublicKbArticleMeta {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  categoryName: string | null;
  tags: string[] | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  updatedAt: Date | null;
}

export const getPublicKbArticleMeta = cache(
  async (orgId: string, slug: string): Promise<PublicKbArticleMeta | null> => {
    if (!orgId || !slug) return null;
    const [article] = await db
      .select({
        id: kbArticles.id,
        title: kbArticles.title,
        slug: kbArticles.slug,
        excerpt: kbArticles.excerpt,
        content: kbArticles.content,
        categoryName: kbCategories.name,
        tags: kbArticles.tags,
        seoTitle: kbArticles.seoTitle,
        seoDescription: kbArticles.seoDescription,
        publishedAt: kbArticles.publishedAt,
        updatedAt: kbArticles.updatedAt,
      })
      .from(kbArticles)
      .leftJoin(kbCategories, eq(kbArticles.categoryId, kbCategories.id))
      .where(
        and(
          eq(kbArticles.orgId, orgId),
          eq(kbArticles.slug, slug),
          eq(kbArticles.status, "published"),
          eq(kbArticles.visibility, "public"),
        ),
      );
    return article ?? null;
  },
);

export const getPublicOrgName = cache(
  async (orgId: string): Promise<string | null> => {
    if (!orgId) return null;
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
      columns: { name: true },
    });
    return org?.name ?? null;
  },
);
