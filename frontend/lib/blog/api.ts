import "server-only";
import { cache } from "react";
import { publicGetNoStore } from "@/lib/public-fetch";
import {
  blogArticleContract,
  blogAuthorContract,
  blogCardListContract,
  blogCategoryContract,
  blogCategoryListContract,
  blogPostPageContract,
  blogRedirectContract,
  blogSitemapPageContract,
  blogSitemapTaxonomyContract,
} from "./contracts";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSlug(value: string, max = 120): boolean {
  return value.length <= max && SLUG.test(value);
}

export const getArticle = cache((slug: string) =>
  isSlug(slug) ? publicGetNoStore(`/blog/by-slug/${slug}`, undefined, blogArticleContract) : Promise.resolve(null),
);

export const getRelated = cache(async (slug: string) =>
  (isSlug(slug) ? await publicGetNoStore(`/blog/by-slug/${slug}/related`, undefined, blogCardListContract) : null) ?? [],
);

export interface ListQuery {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  author?: string;
  featured?: boolean;
}

export const listPosts = cache(async (query: ListQuery) => {
  const page = await publicGetNoStore("/blog/posts", {
    page: query.page,
    limit: query.limit,
    category: query.category,
    tag: query.tag,
    author: query.author,
    featured: query.featured ? "true" : undefined,
  }, blogPostPageContract);
  if (!page) throw new Error("blog listing unavailable");
  return page;
});

export const searchPosts = cache(async (q: string) =>
  (await publicGetNoStore("/blog/search", { q, limit: 20 }, blogCardListContract)) ?? [],
);

export const getCategories = cache(async () => (await publicGetNoStore("/blog/categories", undefined, blogCategoryListContract)) ?? []);

export const getCategory = cache((slug: string) =>
  isSlug(slug) ? publicGetNoStore(`/blog/categories/${slug}`, undefined, blogCategoryContract) : Promise.resolve(null),
);

export const getAuthor = cache((slug: string) =>
  isSlug(slug) ? publicGetNoStore(`/blog/authors/${slug}`, undefined, blogAuthorContract) : Promise.resolve(null),
);

export const resolveBlogRedirect = cache((path: string) =>
  /^\/blogs\/[^?#\s]{1,590}$/.test(path) ? publicGetNoStore("/blog/redirects/resolve", { path }, blogRedirectContract) : Promise.resolve(null),
);

export async function sitemapPosts(cursor?: string) {
  const page = await publicGetNoStore("/blog/sitemap/posts", { cursor }, blogSitemapPageContract);
  if (!page) throw new Error("blog sitemap unavailable");
  return page;
}

export async function sitemapTaxonomy() {
  const page = await publicGetNoStore("/blog/sitemap/taxonomy", undefined, blogSitemapTaxonomyContract);
  if (!page) throw new Error("blog sitemap unavailable");
  return page;
}
