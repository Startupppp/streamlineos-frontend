import { NextResponse, type NextRequest } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { z } from "zod";
import { ok, err, withBlogAdmin, parseBody } from "@/lib/api/helpers";
import { CacheTag } from "@/lib/api/cache-tags";
import { blogDb } from "@/lib/blog-db";
import { blogCategories } from "@/lib/db/schema";
import { getCategories } from "@/server/queries/blog";
import { slugify } from "@/lib/blog-utils";

const getCachedCategories = unstable_cache(
  () => getCategories(),
  [CacheTag.blogCategories],
  { tags: [CacheTag.blogCategories], revalidate: 300 },
);

export async function GET() {
  try {
    const data = await getCachedCategories();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    });
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

    revalidateTag(CacheTag.blogCategories, "default");

    return ok(created, 201);
  });
}
