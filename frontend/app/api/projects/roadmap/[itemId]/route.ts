import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { roadmapItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  isPublic: z.boolean().optional(),
  projectId: z.number().int().positive().nullable().optional(),
  epicTicketId: z.number().int().positive().nullable().optional(),
  targetQuarter: z.string().trim().max(20).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

type RouteContext = { params: Promise<{ itemId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAbility("view", "projects:roadmap", async (session) => {
    const { itemId: idStr } = await ctx.params;
    const itemId = Number(idStr);
    if (!Number.isFinite(itemId)) return err("Invalid item ID", 400);

    const item = await db.query.roadmapItems.findFirst({
      where: and(eq(roadmapItems.id, itemId), eq(roadmapItems.orgId, session.orgId)),
    });
    if (!item) return err("Roadmap item not found", 404);

    return ok(item);
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:roadmap", async (session) => {
    const { itemId: idStr } = await ctx.params;
    const itemId = Number(idStr);
    if (!Number.isFinite(itemId)) return err("Invalid item ID", 400);

    const input = await parseBody(req, updateSchema);

    const [updated] = await db
      .update(roadmapItems)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(roadmapItems.id, itemId), eq(roadmapItems.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Roadmap item not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "projects:roadmap", async (session) => {
    const { itemId: idStr } = await ctx.params;
    const itemId = Number(idStr);
    if (!Number.isFinite(itemId)) return err("Invalid item ID", 400);

    const [deleted] = await db
      .delete(roadmapItems)
      .where(and(eq(roadmapItems.id, itemId), eq(roadmapItems.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Roadmap item not found", 404);
    return ok({ success: true });
  });
}
