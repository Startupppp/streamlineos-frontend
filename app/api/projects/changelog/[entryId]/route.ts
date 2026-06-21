import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { changelogEntries } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().max(20000).optional(),
  version: z.string().trim().max(40).nullable().optional(),
  type: z.enum(["feature", "improvement", "fix"]).optional(),
  isPublished: z.boolean().optional(),
  linkedRoadmapItemId: z.number().int().positive().nullable().optional(),
});

type RouteContext = { params: Promise<{ entryId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("view", "projects:roadmap", async (session) => {
    const { entryId: idStr } = await ctx.params;
    const entryId = Number(idStr);
    if (!Number.isFinite(entryId)) return err("Invalid entry ID", 400);

    const entry = await db.query.changelogEntries.findFirst({
      where: and(eq(changelogEntries.id, entryId), eq(changelogEntries.orgId, session.orgId)),
    });
    if (!entry) return err("Changelog entry not found", 404);

    return ok(entry);
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:roadmap", async (session) => {
    const { entryId: idStr } = await ctx.params;
    const entryId = Number(idStr);
    if (!Number.isFinite(entryId)) return err("Invalid entry ID", 400);

    const input = await parseBody(req, updateSchema);

    const existing = await db.query.changelogEntries.findFirst({
      where: and(eq(changelogEntries.id, entryId), eq(changelogEntries.orgId, session.orgId)),
      columns: { isPublished: true, publishedAt: true },
    });
    if (!existing) return err("Changelog entry not found", 404);

    let publishedAt = existing.publishedAt;
    if (input.isPublished === true && !existing.isPublished) publishedAt = new Date();
    if (input.isPublished === false) publishedAt = null;

    const [updated] = await db
      .update(changelogEntries)
      .set({ ...input, publishedAt, updatedAt: new Date() })
      .where(and(eq(changelogEntries.id, entryId), eq(changelogEntries.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Changelog entry not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:roadmap", async (session) => {
    const { entryId: idStr } = await ctx.params;
    const entryId = Number(idStr);
    if (!Number.isFinite(entryId)) return err("Invalid entry ID", 400);

    const [deleted] = await db
      .delete(changelogEntries)
      .where(and(eq(changelogEntries.id, entryId), eq(changelogEntries.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Changelog entry not found", 404);
    return ok({ success: true });
  });
}
