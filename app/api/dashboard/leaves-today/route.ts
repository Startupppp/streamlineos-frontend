import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, users, leaveTypes } from "@/lib/db/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const today = new Date().toISOString().split("T")[0];

    const data = await db
      .select({
        id: leaveRequests.id,
        userId: leaveRequests.userId,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        reason: leaveRequests.reason,
        leaveType: leaveTypes.name,
        userName: users.name,
        userImage: users.image,
        userDesignation: users.designation,
        userDepartmentId: users.departmentId,
      })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.status, "APPROVED"),
          lte(leaveRequests.startDate, today),
          gte(leaveRequests.endDate, today)
        )
      );

    return ok(data);
  });
}
