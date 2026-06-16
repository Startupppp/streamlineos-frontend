import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbCategories } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { slugify } from "@/lib/format-utils";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  icon: z.string().max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

export async function GET() {
  return withAbility("view", "support:kb", async (session) => {
    const categories = await db.query.kbCategories.findMany({
      where: eq(kbCategories.orgId, session.orgId),
      orderBy: [asc(kbCategories.sortOrder), asc(kbCategories.name)],
    });
    return ok(categories);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "support:kb", async (session) => {
    const input = await parseBody(req, createSchema);
    const slug = slugify(input.name);
    if (!slug) return err("Invalid name", 400);

    const existing = await db.query.kbCategories.findFirst({
      where: and(eq(kbCategories.orgId, session.orgId), eq(kbCategories.slug, slug)),
      columns: { id: true },
    });
    if (existing) return err("A category with this name already exists", 409);

    const [category] = await db
      .insert(kbCategories)
      .values({
        orgId: session.orgId,
        name: input.name,
        slug,
        description: input.description ?? null,
        icon: input.icon ?? null,
        sortOrder: input.sortOrder ?? 0,
        isPublished: input.isPublished ?? false,
      })
      .returning();

    return ok(category, 201);
  });
}
