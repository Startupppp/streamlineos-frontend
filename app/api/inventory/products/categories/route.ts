import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody, serverErr } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  parentCategoryId: z.number().int().positive().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(_req: NextRequest) {
  return withAbility("read", "inventory:products", async (session) => {
    try {
      const categories = await db.query.invCategories.findMany({
        where: eq(invCategories.orgId, session.orgId),
        with: { children: true },
        orderBy: (t, { asc }) => [asc(t.name)],
      });
      return ok(categories);
    } catch (error) {
      return serverErr("Failed to load categories", error);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAbility("create", "inventory:products", async (session) => {
    try {
      const input = await parseBody(req, createCategorySchema);

      const [category] = await db
        .insert(invCategories)
        .values({
          orgId: session.orgId,
          name: input.name,
          parentCategoryId: input.parentCategoryId ?? null,
          description: input.description ?? null,
          isActive: input.isActive,
        })
        .returning();

      return ok(category, 201);
    } catch (error) {
      return serverErr("Failed to create category", error);
    }
  });
}
