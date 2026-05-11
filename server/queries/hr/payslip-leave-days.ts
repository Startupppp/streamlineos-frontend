import { db } from "@/lib/db";
import { leaveRequests } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { leaveDaysOverlappingMonth } from "@/lib/hr/leave-days-overlap";

export { leaveDaysOverlappingMonth } from "@/lib/hr/leave-days-overlap";

export async function countApprovedLeaveDaysInMonth(
  orgId: string,
  userId: string,
  monthYyyyMm: string
): Promise<number> {
  const { calendarDaysInMonth } = await import("@/lib/hr/payroll-calculations");
  const last = calendarDaysInMonth(monthYyyyMm);
  const monthStartStr = `${monthYyyyMm}-01`;
  const monthEndStr = `${monthYyyyMm}-${String(last).padStart(2, "0")}`;

  const rows = await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.orgId, orgId),
      eq(leaveRequests.userId, userId),
      eq(leaveRequests.status, "APPROVED"),
      lte(leaveRequests.startDate, monthEndStr),
      gte(leaveRequests.endDate, monthStartStr)
    ),
    columns: { startDate: true, endDate: true, isHalfDay: true },
  });

  let total = 0;
  for (const r of rows) {
    total += leaveDaysOverlappingMonth(r.startDate, r.endDate, monthYyyyMm, r.isHalfDay);
  }
  return Math.round(total * 100) / 100;
}
