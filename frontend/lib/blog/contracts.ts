import { z } from "zod";

/**
 * Wire contracts for the backend's public blog projection (`/blog/*`). Published content only: the
 * backend never sends email addresses, draft data or revision history, and these shapes would reject
 * a payload that tried to.
 */
const cover = z.object({
  src: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  alt: z.string(),
  caption: z.string().nullable(),
  credit: z.string().nullable(),
  sources: z.array(z.object({ src: z.string(), width: z.number().int(), type: z.string() })),
});

const cardAuthor = z.object({ name: z.string(), slug: z.string(), avatar: z.string().nullable(), role: z.string().nullable() });

export const blogCardContract = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  coverImage: z.string(),
  cover: cover.nullable(),
  isFeatured: z.boolean(),
  readingTime: z.number().int(),
  tags: z.array(z.string()),
  publishedAt: z.string().nullable(),
  modifiedAt: z.string().nullable(),
  category: z.object({ name: z.string(), slug: z.string(), color: z.string().nullable() }).nullable(),
  author: cardAuthor.nullable(),
});

export const blogPostPageContract = z.object({
  posts: z.array(blogCardContract),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export const blogArticleContract = blogCardContract.extend({
  revisionId: z.string(),
  standfirst: z.string().nullable(),
  contentHtml: z.string(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  socialImage: z.string().nullable(),
  ctaKey: z.string().nullable(),
  author: cardAuthor.extend({ bio: z.string().nullable(), twitter: z.string().nullable(), linkedin: z.string().nullable() }).nullable(),
});

export const blogCardListContract = z.array(blogCardContract);

export const blogCategoryListContract = z.array(z.object({
  name: z.string(), slug: z.string(), color: z.string().nullable(), description: z.string().nullable(), count: z.number().int(),
}));

export const blogCategoryContract = z.object({
  name: z.string(), slug: z.string(), color: z.string().nullable(), description: z.string().nullable(),
  seoTitle: z.string().nullable(), seoDescription: z.string().nullable(), count: z.number().int(),
});

export const blogAuthorContract = z.object({
  name: z.string(), slug: z.string(), avatar: z.string().nullable(), role: z.string().nullable(), bio: z.string().nullable(),
  twitter: z.string().nullable(), linkedin: z.string().nullable(), count: z.number().int(),
});

export const blogRedirectContract = z.object({
  statusCode: z.union([z.literal(301), z.literal(410)]),
  targetPath: z.string().nullable(),
});

export const blogSitemapPageContract = z.object({
  posts: z.array(z.object({ slug: z.string(), modifiedAt: z.string().nullable() })),
  nextCursor: z.string().nullable(),
});

export const blogSitemapTaxonomyContract = z.object({
  categories: z.array(z.object({ slug: z.string(), modifiedAt: z.string().nullable() })),
  authors: z.array(z.object({ slug: z.string(), modifiedAt: z.string().nullable() })),
});

export type BlogCard = z.infer<typeof blogCardContract>;
export type BlogArticle = z.infer<typeof blogArticleContract>;
export type BlogPostPage = z.infer<typeof blogPostPageContract>;
export type BlogCategorySummary = z.infer<typeof blogCategoryListContract>[number];
