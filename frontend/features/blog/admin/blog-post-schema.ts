import { z } from "zod";

export const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(256, "Title too long"),
  excerpt: z.string().min(1, "Excerpt is required").max(500, "Excerpt too long"),
  content: z.string().min(1, "Content is required"),
  coverImage: z.string().min(1, "Cover image URL is required"),
  status: z.enum(["draft", "published", "archived"]),
  isFeatured: z.boolean(),
  categoryId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()),
  slug: z.string().max(256).optional(),
  metaTitle: z.string().max(256).nullable().optional(),
  metaDescription: z.string().max(320).nullable().optional(),
});

export type BlogPostFormValues = z.infer<typeof blogPostSchema>;
