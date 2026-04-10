import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, users, leaveTypes } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { addDays, format } from "date-fns";

export async function GET() {
  return withAuth(async (session) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");

    const data = await db
      .select({
        id: leaveRequests.id,
        userId: leaveRequests.userId,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        leaveType: leaveTypes.name,
        userName: users.name,
        userImage: users.image,
        userDesignation: users.designation,
      })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.status, "APPROVED"),
          gte(leaveRequests.startDate, today),
          lte(leaveRequests.startDate, nextWeek)
        )
      );

    return ok(data);
  });
}
