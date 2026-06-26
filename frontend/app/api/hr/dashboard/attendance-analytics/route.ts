import { withAbility, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  attendance,
  wfhRequests,
  departments,
  departmentMembers,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, gte, lte, count, sum, sql, inArray } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/hr-cache";

export const dynamic = "force-dynamic";

function getWorkingDaysInMonth(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate();
  let working = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) working++;
  }
  return working;
}

function getWorkingDaysSoFar(year: number, month: number): number {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const lastDay = isCurrentMonth ? today.getDate() : new Date(year, month, 0).getDate();
  let working = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) working++;
  }
  return working;
}

const LATE_CHECKIN_HOUR = 9;
const LATE_CHECKIN_MINUTE = 30;

export async function GET() {
  return withAbility("read", "hr:analytics", async (session) => {
    const orgId = session.orgId;

    const data = await cached(
      `hr:dashboard:attendance-analytics:${orgId}`,
      async () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
        const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;

        const workingDaysSoFar = getWorkingDaysSoFar(year, month);

        const [
          activeMembers,
          monthlyAttendance,
          lateArrivals,
          wfhApproved,
          overtimeRecords,
          deptAttendance,
        ] = await Promise.all([
          db
            .select({ count: count() })
            .from(organizationMembers)
            .innerJoin(users, eq(organizationMembers.userId, users.id))
            .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true))),

          db
            .select({ count: count() })
            .from(attendance)
            .where(
              and(
                eq(attendance.orgId, orgId),
                gte(attendance.date, monthStart),
                lte(attendance.date, monthEnd),
                inArray(attendance.status, ["PRESENT", "HALF_DAY", "LATE"]),
              ),
            ),

          db
            .select({ count: count() })
            .from(attendance)
            .where(
              and(
                eq(attendance.orgId, orgId),
                gte(attendance.date, monthStart),
                lte(attendance.date, monthEnd),
                sql`EXTRACT(HOUR FROM ${attendance.checkIn}) * 60 + EXTRACT(MINUTE FROM ${attendance.checkIn}) > ${LATE_CHECKIN_HOUR * 60 + LATE_CHECKIN_MINUTE}`,
              ),
            ),

          db
            .select({ count: count() })
            .from(wfhRequests)
            .where(
              and(
                eq(wfhRequests.orgId, orgId),
                eq(wfhRequests.status, "APPROVED"),
                gte(wfhRequests.date, monthStart),
                lte(wfhRequests.date, monthEnd),
              ),
            ),

          db
            .select({ count: count() })
            .from(attendance)
            .where(
              and(
                eq(attendance.orgId, orgId),
                gte(attendance.date, monthStart),
                lte(attendance.date, monthEnd),
                eq(attendance.isOvertime, true),
              ),
            ),

          db
            .select({
              departmentName: departments.name,
              presentCount: count(attendance.id),
            })
            .from(departments)
            .leftJoin(departmentMembers, eq(departmentMembers.departmentId, departments.id))
            .leftJoin(
              attendance,
              and(
                eq(attendance.userId, departmentMembers.userId),
                eq(attendance.orgId, orgId),
                gte(attendance.date, monthStart),
                lte(attendance.date, monthEnd),
                inArray(attendance.status, ["PRESENT", "HALF_DAY", "LATE"]),
              ),
            )
            .where(eq(departments.orgId, orgId))
            .groupBy(departments.id, departments.name)
            .orderBy(sql`count(${attendance.id}) desc`),
        ]);

        const totalEmployees = Number(activeMembers[0]?.count ?? 0);
        const totalPresentLogs = Number(monthlyAttendance[0]?.count ?? 0);
        const expectedLogs = totalEmployees * workingDaysSoFar;
        const attendancePct = expectedLogs > 0 ? Math.round((totalPresentLogs / expectedLogs) * 100) : 0;
        const absenteeismPct = 100 - attendancePct;

        return {
          month: `${year}-${String(month).padStart(2, "0")}`,
          workingDaysSoFar,
          totalEmployees,
          attendancePct,
          absenteeismPct: Math.max(0, absenteeismPct),
          lateArrivals: Number(lateArrivals[0]?.count ?? 0),
          wfhApproved: Number(wfhApproved[0]?.count ?? 0),
          overtimeInstances: Number(overtimeRecords[0]?.count ?? 0),
          byDepartment: deptAttendance.map((d) => ({
            name: d.departmentName,
            presentCount: Number(d.presentCount),
            expectedCount: workingDaysSoFar,
          })),
        };
      },
      { ttlSeconds: CACHE_TTL.SHORT },
    );

    return ok(data);
  });
}
