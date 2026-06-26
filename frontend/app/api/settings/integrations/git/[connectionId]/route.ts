import { type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { gitConnections } from "@/lib/db/schema";

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  repoUrl: z.string().url().max(500).optional(),
  repoName: z.string().max(200).nullable().optional(),
});

type RouteContext = { params: Promise<{ connectionId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "settings", async (session) => {
    const { connectionId: idStr } = await ctx.params;
    const connectionId = Number(idStr);
    if (!Number.isFinite(connectionId)) return err("Invalid connection ID", 400);

    const input = await parseBody(req, updateSchema);
    if (input.isActive === undefined && input.repoUrl === undefined && input.repoName === undefined) {
      return err("No fields to update", 400);
    }

    const [updated] = await db
      .update(gitConnections)
      .set({
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.repoUrl !== undefined ? { repoUrl: input.repoUrl } : {}),
        ...(input.repoName !== undefined ? { repoName: input.repoName } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(gitConnections.id, connectionId), eq(gitConnections.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Connection not found", 404);

    return ok({
      id: updated.id,
      provider: updated.provider,
      repoUrl: updated.repoUrl,
      repoName: updated.repoName,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "settings", async (session) => {
    const { connectionId: idStr } = await ctx.params;
    const connectionId = Number(idStr);
    if (!Number.isFinite(connectionId)) return err("Invalid connection ID", 400);

    const [deleted] = await db
      .delete(gitConnections)
      .where(and(eq(gitConnections.id, connectionId), eq(gitConnections.orgId, session.orgId)))
      .returning({ id: gitConnections.id });

    if (!deleted) return err("Connection not found", 404);
    return ok({ success: true });
  });
}
