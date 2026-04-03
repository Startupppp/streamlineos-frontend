/**
 * PATCH /api/v1/projects/[id]/tickets/reorder  — bulk-reorder tickets (board drag-and-drop)
 *
 * Body: { items: Array<{ id: number; status: string; order: number }> }
 * Updates status and order for each ticket in a transaction.
 */

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      status: z.string(),
      order: z.number(),
    })
  ),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const { items } = await parseBody(req, reorderSchema);

    if (items.length === 0) return ok({ success: true });

    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(tickets)
          .set({ status: item.status, order: item.order, updatedAt: new Date() })
          .where(
            and(
              eq(tickets.id, item.id),
              eq(tickets.projectId, projectId),
              eq(tickets.orgId, session.orgId!)
            )
          );
      }
    });

    return ok({ success: true });
  });
}
