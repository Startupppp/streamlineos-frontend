import { withAuth, ok, err } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { leaveRequests, resignations } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();
    if (!ability.can("approve", "hr:leaves")) {
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

    const pendingLeaves = leaveCount?.count ?? 0;
    const pendingResignations = resignationCount?.count ?? 0;

    return ok({
      pendingLeaves,
      pendingResignations,
      total: pendingLeaves + pendingResignations,
    });
  });
}
