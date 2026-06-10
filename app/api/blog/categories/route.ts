import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, withBlogAdmin, parseBody } from "@/lib/api/helpers";
import { blogDb } from "@/lib/blog-db";
import { blogCategories } from "@/lib/db/schema";
import { getCategories } from "@/server/queries/blog";
import { slugify } from "@/lib/blog-utils";

/** Public: list categories with published-post counts. */
export async function GET() {
  try {
    return ok(await getCategories());
  } catch {
    return err("Failed to load categories", 500);
  }
}

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional().nullable(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Color must be a hex value like #3B82F6")
    .optional()
    .nullable(),
});

/** Admin: create a category. */
export async function POST(req: NextRequest) {
  return withBlogAdmin(async () => {
    const body = await parseBody(req, createCategorySchema);
    const slug = slugify(body.name);

    const existing = await blogDb.query.blogCategories.findFirst({
      where: (c, { eq }) => eq(c.slug, slug),
    });
    if (existing) return err("A category with that name already exists", 409);

    const [created] = await blogDb
      .insert(blogCategories)
      .values({
        name: body.name,
        slug,
        description: body.description ?? null,
        color: body.color ?? null,
      })
      .returning();

    return ok(created, 201);
  });
}
