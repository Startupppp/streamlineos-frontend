import "server-only";
import { BACKEND_URL } from "@/lib/backend-url";
import { parseApiResponse } from "@/lib/api-envelope";

const TIMEOUT_MS = 8_000;
export const PUBLIC_REVALIDATE_SECS = 60;

export interface PublicOrgInfo {
  name: string;
}

export interface PublicKbCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface PublicKbArticleListItem {
  id: number;
  categoryId: number | null;
  title: string;
  slug: string;
  excerpt: string | null;
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  tags: string[] | null;
  publishedAt: string | null;
}

export interface PublicKbListData {
  categories: PublicKbCategory[];
  articles: PublicKbArticleListItem[];
}

export interface PublicKbArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  tags: string[] | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
}

export async function publicGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T | null> {
  const url = new URL(`${BACKEND_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString(), {
    next: { revalidate: PUBLIC_REVALIDATE_SECS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  return parseApiResponse<T>(res);
}
