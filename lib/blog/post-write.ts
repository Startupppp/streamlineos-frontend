import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { blogDb } from "@/lib/blog-db";
import { blogPosts } from "@/lib/db/schema";
import { slugify } from "@/lib/blog-utils";

export const postCreateSchema = z.object({
  title: z.string().min(1).max(256),
  excerpt: z.string().min(1).max(500),
  content: z.string().min(1),
  contentJson: z.record(z.string(), z.unknown()).optional().nullable(),
  coverImage: z.string().min(1),
  categoryId: z.string().uuid().optional().nullable(),
  authorId: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  metaTitle: z.string().max(256).optional().nullable(),
  metaDescription: z.string().max(320).optional().nullable(),
  slug: z.string().max(256).optional(),
});

export const postUpdateSchema = postCreateSchema.partial();

export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;

/** Return a slug unique across blog_posts, appending -2, -3, … on collision. */
export async function ensureUniqueSlug(
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = slugify(base) || "post";
  let candidate = root;
  let n = 2;
  // Loop until no other row holds the candidate slug.
  for (;;) {
    const clash = await blogDb.query.blogPosts.findFirst({
      where: excludeId
        ? and(eq(blogPosts.slug, candidate), ne(blogPosts.id, excludeId))
        : eq(blogPosts.slug, candidate),
      columns: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${root}-${n++}`;
  }
}
