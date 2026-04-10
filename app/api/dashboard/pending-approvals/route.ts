import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { leaveRequests, resignations } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Forbidden", 403);
    }

    const [leaveCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.status, "PENDING")
        )
      );

    const resignationStatuses =
      session.user.role === "HR"
        ? ["SUBMITTED", "PENDING_HR"]
        : ["HR_APPROVED"];

    const [resignationCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resignations)
      .where(
        and(
          eq(resignations.orgId, session.orgId),
          inArray(resignations.status, resignationStatuses as ("SUBMITTED" | "PENDING_HR" | "HR_APPROVED")[])
        )
      );

    return ok({
      pendingLeaves: leaveCount?.count ?? 0,
      pendingResignations: resignationCount?.count ?? 0,
      total: (leaveCount?.count ?? 0) + (resignationCount?.count ?? 0),
    });
  });
}
