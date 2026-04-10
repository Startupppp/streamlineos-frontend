import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, users } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { addDays } from "date-fns";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const today = formatDateOnly(new Date());
    const nextWeek = formatDateOnly(addDays(new Date(), 7));

    const rows = await db
      .select({
        id: leaveRequests.id,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        leaveTypeId: leaveRequests.leaveTypeId,
        employeeName: users.name,
        employeeDesignation: users.designation,
        employeeImage: users.image,
      })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.status, "APPROVED"),
          gte(leaveRequests.startDate, today),
          lte(leaveRequests.startDate, nextWeek)
        )
      );

    return ok(rows);
  });
}
