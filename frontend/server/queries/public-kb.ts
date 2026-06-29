import { db } from "@/lib/db";
import { kbArticles } from "@/lib/db/schema/support/kb";
import { organizations } from "@/lib/db/schema/auth";
import { eq, and } from "drizzle-orm";

export async function getPublicKbArticleMeta(
  orgId: string,
  slug: string,
): Promise<{
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  excerpt: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  tags: string[] | null;
} | null> {
  const article = await db.query.kbArticles.findFirst({
    where: and(
      eq(kbArticles.orgId, orgId),
      eq(kbArticles.slug, slug),
      eq(kbArticles.status, "published"),
      eq(kbArticles.visibility, "public"),
    ),
    columns: {
      title: true,
      excerpt: true,
      createdAt: true,
      updatedAt: true,
      tags: true,
    },
  });

  if (!article) return null;

  return {
    title: article.title,
    seoTitle: null,
    seoDescription: null,
    excerpt: article.excerpt ?? null,
    publishedAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    tags: article.tags ?? null,
  };
}

export async function getPublicOrgName(orgId: string): Promise<string | null> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { name: true },
  });
  return org?.name ?? null;
}
