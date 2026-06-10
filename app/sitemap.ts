import type { MetadataRoute } from "next";
import { BRAND_URL } from "@/lib/branding";
import { getAllPosts } from "@/features/blog/data/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = BRAND_URL.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.7 },
    { url: `${base}/signin`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/legal/security`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const postRoutes: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes];
}
