/**
 * PATCH  /api/projects/[id]/modules/[moduleId]  — update module
 * DELETE /api/projects/[id]/modules/[moduleId]  — delete module (unlinking work items)
 *
 * On delete, sets moduleId = null on all associated tickets.
 */

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { modules, tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateModuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z
    .enum(["backlog", "planned", "in-progress", "completed", "paused", "cancelled"])
    .optional(),
  leadId: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

type RouteParams = { params: Promise<{ projectId: string; moduleId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, moduleId } = await params;
    const projectId = Number(id);
    const mId = Number(moduleId);
    if (!projectId || !mId) return err("Invalid id", 400);

    const body = await parseBody(req, updateModuleSchema);

    const [updated] = await db
      .update(modules)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(modules.id, mId), eq(modules.orgId, session.orgId!)))
      .returning();

    if (!updated) return err("Module not found", 404);

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, moduleId } = await params;
    const projectId = Number(id);
    const mId = Number(moduleId);
    if (!projectId || !mId) return err("Invalid id", 400);

    // Unlink all tickets from this module before deletion
    await db
      .update(tickets)
      .set({ moduleId: null })
      .where(eq(tickets.moduleId, mId));

    await db
      .delete(modules)
      .where(and(eq(modules.id, mId), eq(modules.orgId, session.orgId!)));

    return ok({ success: true });
  });
}
