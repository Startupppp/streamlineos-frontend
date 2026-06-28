"server-only";

import { cache } from "react";
import { serverPublicFetch } from "@/lib/api/server-client";

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
  publishedAt: string | null;
  updatedAt: string | null;
}

interface BackendKbArticle extends PublicKbArticleMeta {
  categoryId: number | null;
  categorySlug: string | null;
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
}

interface BackendOrgName {
  name: string;
}

export const getPublicKbArticleMeta = cache(
  async (orgId: string, slug: string): Promise<PublicKbArticleMeta | null> => {
    if (!orgId || !slug) return null;
    try {
      const article = await serverPublicFetch.get<BackendKbArticle>(
        `/public/kb/${encodeURIComponent(slug)}`,
        { org: orgId },
      );
      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        categoryName: article.categoryName,
        tags: article.tags,
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
        publishedAt: article.publishedAt,
        updatedAt: article.updatedAt,
      };
    } catch {
      return null;
    }
  },
);

export const getPublicOrgName = cache(
  async (orgId: string): Promise<string | null> => {
    if (!orgId) return null;
    try {
      const result = await serverPublicFetch.get<BackendOrgName>(
        `/public/org/${encodeURIComponent(orgId)}`,
      );
      return result.name;
    } catch {
      return null;
    }
  },
);
