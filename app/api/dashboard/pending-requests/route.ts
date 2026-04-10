import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveTypes } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const data = await db
      .select({
        id: leaveRequests.id,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        leaveType: leaveTypes.name,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.userId, session.user.id),
          eq(leaveRequests.status, "PENDING")
        )
      )
      .orderBy(desc(leaveRequests.createdAt));

    return ok(data);
  });
}
