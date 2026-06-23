import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { headcountRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ requestId: string }> };

const schema = z.object({
  reason: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CEO", "HR", "ADMIN", "HR_MANAGER"].includes(role)) return err("Forbidden", 403);

    const { requestId } = await params;
    const id = Number(requestId);
    if (!Number.isFinite(id)) return err("Invalid request ID", 400);

    const existing = await db.query.headcountRequests.findFirst({
      where: and(eq(headcountRequests.id, id), eq(headcountRequests.orgId, session.orgId)),
    });
    if (!existing) return err("Not found", 404);
    if (existing.status !== "SUBMITTED") return err("Only SUBMITTED requests can be rejected", 400);

    const body = await parseBody(req, schema);
    const [updated] = await db
      .update(headcountRequests)
      .set({ status: "REJECTED", rejectedReason: body.reason })
      .where(eq(headcountRequests.id, id))
      .returning();
    return ok(updated);
  });
}
