import type { MetadataRoute } from "next";
import { BRAND_URL } from "@/lib/branding";
import { sitemapPosts, sitemapTaxonomy } from "@/lib/blog/api";

// Blog URLs come from the backend at request time, so a publish or withdrawal is reflected without
// a rebuild. A backend failure fails the sitemap (a crawler retries) rather than silently dropping
// every article from it.
export const dynamic = "force-dynamic";

/** The sitemap protocol's per-file limit. */
const MAX_URLS = 50_000;

async function blogEntries(base: string): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  let cursor: string | undefined;
  do {
    const page = await sitemapPosts(cursor);
    for (const post of page.posts) {
      entries.push({ url: `${base}/blogs/${post.slug}`, lastModified: post.modifiedAt ? new Date(post.modifiedAt) : undefined, changeFrequency: "monthly", priority: 0.7 });
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor && entries.length < MAX_URLS - 200);

  const { categories, authors } = await sitemapTaxonomy();
  for (const c of categories) entries.push({ url: `${base}/blogs/category/${c.slug}`, lastModified: c.modifiedAt ? new Date(c.modifiedAt) : undefined, changeFrequency: "weekly", priority: 0.6 });
  for (const a of authors) entries.push({ url: `${base}/blogs/author/${a.slug}`, lastModified: a.modifiedAt ? new Date(a.modifiedAt) : undefined, changeFrequency: "monthly", priority: 0.4 });
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base = BRAND_URL.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/blogs`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/blogs/archive`, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/blogs/editorial-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.7 },
    { url: `${base}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/legal/security`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  return [...staticRoutes, ...(await blogEntries(base))];
}
