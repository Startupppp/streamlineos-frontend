import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { headcountRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(_req: NextRequest, { params }: RouteContext) {
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
    if (existing.status !== "SUBMITTED") return err("Only SUBMITTED requests can be approved", 400);

    const [updated] = await db
      .update(headcountRequests)
      .set({ status: "APPROVED", approvedBy: session.user.id, approvedAt: new Date() })
      .where(eq(headcountRequests.id, id))
      .returning();
    return ok(updated);
  });
}
