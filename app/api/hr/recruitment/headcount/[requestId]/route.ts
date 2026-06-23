import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { headcountRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ requestId: string }> };

const updateSchema = z.object({
  requestedRole: z.string().min(1).max(200).optional(),
  level: z.string().max(100).optional(),
  justification: z.string().max(5000).optional(),
  targetDate: z.string().optional(),
  status: z.enum(["DRAFT", "SUBMITTED"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const { requestId } = await params;
    const id = Number(requestId);
    if (!Number.isFinite(id)) return err("Invalid request ID", 400);

    const existing = await db.query.headcountRequests.findFirst({
      where: and(eq(headcountRequests.id, id), eq(headcountRequests.orgId, session.orgId)),
    });
    if (!existing) return err("Not found", 404);
    if (existing.requestedBy !== session.user.id) return err("Forbidden", 403);
    if (existing.status !== "DRAFT") return err("Only DRAFT requests can be edited", 400);

    const body = await parseBody(req, updateSchema);
    const [updated] = await db
      .update(headcountRequests)
      .set(body)
      .where(eq(headcountRequests.id, id))
      .returning();
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const { requestId } = await params;
    const id = Number(requestId);
    if (!Number.isFinite(id)) return err("Invalid request ID", 400);

    const existing = await db.query.headcountRequests.findFirst({
      where: and(eq(headcountRequests.id, id), eq(headcountRequests.orgId, session.orgId)),
    });
    if (!existing) return err("Not found", 404);
    if (existing.requestedBy !== session.user.id) return err("Forbidden", 403);
    if (existing.status !== "DRAFT") return err("Cannot delete non-draft requests", 400);

    await db.delete(headcountRequests).where(eq(headcountRequests.id, id));
    return ok({ success: true });
  });
}
