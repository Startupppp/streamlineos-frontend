import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, resignations } from "@/lib/db/schema";
import { and, eq, count } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin =
      session.user.role === "CEO" || session.user.role === "HR";
    if (!isAdmin) return err("Admin only.", 403);

    const [leaveCount] = await db
      .select({ count: count() })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.status, "PENDING")
        )
      );

    const [resignationCount] = await db
      .select({ count: count() })
      .from(resignations)
      .where(
        and(
          eq(resignations.orgId, session.orgId),
          eq(resignations.status, "SUBMITTED")
        )
      );

    const pendingLeaves = Number(leaveCount?.count ?? 0);
    const pendingResignations = Number(resignationCount?.count ?? 0);

    return ok({
      pendingLeaves,
      pendingResignations,
      total: pendingLeaves + pendingResignations,
    });
  });
}
