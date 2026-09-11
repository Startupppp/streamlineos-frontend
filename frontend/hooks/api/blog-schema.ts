import { z } from "zod";

const wireDate = () => z.string().transform((s) => new Date(s));
const nullableWireDate = () =>
  z
    .string()
    .nullable()
    .transform((s) => (s ? new Date(s) : null));

const blogAuthorContract = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  avatar: z.string().nullable(),
  bio: z.string().nullable(),
  role: z.string().nullable(),
  twitter: z.string().nullable(),
  linkedin: z.string().nullable(),
  createdAt: wireDate(),
});

const blogCategoryContract = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  createdAt: wireDate(),
});

const blogPostContract = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  coverImage: z.string(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  content: z.string(),
  contentJson: z.record(z.string(), z.unknown()).nullable(),
  categoryId: z.string().nullable(),
  authorId: z.string().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  isFeatured: z.boolean(),
  readingTime: z.number().int().nullable(),
  publishedAt: nullableWireDate(),
  tags: z.array(z.string()),
  createdAt: wireDate(),
  updatedAt: wireDate(),
});

export const blogPostWithRelationsContract = blogPostContract.extend({
  category: blogCategoryContract.nullable(),
  author: blogAuthorContract.nullable(),
});

export const blogFeedContract = z.object({
  posts: z.array(blogPostWithRelationsContract),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const blogAdminPostListContract = z.object({
  items: z.array(blogPostWithRelationsContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const blogAdminPostDetailContract = blogPostWithRelationsContract;

export const blogAdminPostContract = blogPostContract;

export const blogAdminCategoryListContract = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    color: z.string().nullable(),
    createdAt: wireDate(),
    postCount: z.number().int(),
  }),
);

export const blogAdminCategoryContract = blogCategoryContract;

export const blogSuccessContract = z.object({ success: z.literal(true) });
