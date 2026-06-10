import { type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { ok, err, withBlogAdmin, parseBody } from "@/lib/api/helpers";
import { blogDb } from "@/lib/blog-db";
import { blogCategories } from "@/lib/db/schema";
import { slugify } from "@/lib/blog-utils";

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Color must be a hex value like #3B82F6")
    .optional()
    .nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withBlogAdmin(async () => {
    const { id } = await params;
    const body = await parseBody(req, updateCategorySchema);

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      updates.name = body.name;
      updates.slug = slugify(body.name);
    }
    if (body.description !== undefined) updates.description = body.description;
    if (body.color !== undefined) updates.color = body.color;

    const [updated] = await blogDb
      .update(blogCategories)
      .set(updates)
      .where(eq(blogCategories.id, id))
      .returning();

    if (!updated) return err("Category not found", 404);
    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withBlogAdmin(async () => {
    const { id } = await params;
    const [deleted] = await blogDb
      .delete(blogCategories)
      .where(eq(blogCategories.id, id))
      .returning();
    if (!deleted) return err("Category not found", 404);
    return ok({ success: true });
  });
}
