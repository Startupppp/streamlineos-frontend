import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { playbookEntries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().max(80).nullable().optional(),
  content: z.string().max(10000).optional(),
  sortOrder: z.number().int().optional(),
});

type RouteContext = { params: Promise<{ entryId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "sales", async (session) => {
    const { entryId: idStr } = await ctx.params;
    const entryId = Number(idStr);
    if (!Number.isFinite(entryId)) return err("Invalid entry ID", 400);

    const input = await parseBody(req, updateSchema);

    const values: Partial<typeof playbookEntries.$inferInsert> = {};
    if (input.title !== undefined) values.title = input.title;
    if (input.category !== undefined) values.category = input.category?.trim() || null;
    if (input.content !== undefined) values.content = input.content;
    if (input.sortOrder !== undefined) values.sortOrder = input.sortOrder;

    const [updated] = await db
      .update(playbookEntries)
      .set(values)
      .where(and(eq(playbookEntries.id, entryId), eq(playbookEntries.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Playbook entry not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "sales", async (session) => {
    const { entryId: idStr } = await ctx.params;
    const entryId = Number(idStr);
    if (!Number.isFinite(entryId)) return err("Invalid entry ID", 400);

    const [deleted] = await db
      .delete(playbookEntries)
      .where(and(eq(playbookEntries.id, entryId), eq(playbookEntries.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Playbook entry not found", 404);
    return ok({ success: true });
  });
}
