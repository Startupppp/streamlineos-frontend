import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbCategories } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { slugify } from "@/lib/format-utils";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ categoryId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "support:kb", async (session) => {
    const { categoryId: idStr } = await ctx.params;
    const categoryId = Number(idStr);
    if (!Number.isFinite(categoryId)) return err("Invalid category ID", 400);

    const input = await parseBody(req, updateSchema);

    const values: Partial<typeof kbCategories.$inferInsert> = {
      description: input.description,
      icon: input.icon,
      sortOrder: input.sortOrder,
      isPublished: input.isPublished,
    };
    if (input.name !== undefined) {
      const slug = slugify(input.name);
      if (!slug) return err("Invalid name", 400);
      const clash = await db.query.kbCategories.findFirst({
        where: and(
          eq(kbCategories.orgId, session.orgId),
          eq(kbCategories.slug, slug),
          ne(kbCategories.id, categoryId),
        ),
        columns: { id: true },
      });
      if (clash) return err("A category with this name already exists", 409);
      values.name = input.name;
      values.slug = slug;
    }

    const [updated] = await db
      .update(kbCategories)
      .set(values)
      .where(and(eq(kbCategories.id, categoryId), eq(kbCategories.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Category not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "support:kb", async (session) => {
    const { categoryId: idStr } = await ctx.params;
    const categoryId = Number(idStr);
    if (!Number.isFinite(categoryId)) return err("Invalid category ID", 400);

    const [deleted] = await db
      .delete(kbCategories)
      .where(and(eq(kbCategories.id, categoryId), eq(kbCategories.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Category not found", 404);
    return ok({ success: true });
  });
}
