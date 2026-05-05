import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { holidayWorkRequests, attendance, salaryStructures } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { calendarDaysInMonth } from "@/lib/hr/payroll-calculations";
import type { NextRequest } from "next/server";

const FULL_DAY_HOURS = 8;

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can preview overtime.", 403);
    }

    const userId = req.nextUrl.searchParams.get("userId");
    const month = req.nextUrl.searchParams.get("month");

    if (!userId || !month || !/^\d{4}-\d{2}$/.test(month)) {
      return err("userId and month (YYYY-MM) are required.", 400);
    }

    const [yr, mo] = month.split("-").map(Number);
    const monthStart = `${month}-01`;
    const lastDay = new Date(yr, mo, 0).getDate();
    const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

    const salary = await db.query.salaryStructures.findFirst({
      where: and(
        eq(salaryStructures.orgId, session.orgId),
        eq(salaryStructures.userId, userId),
        eq(salaryStructures.isActive, true)
      ),
    });

    const approvedRequests = await db.query.holidayWorkRequests.findMany({
      where: and(
        eq(holidayWorkRequests.orgId, session.orgId),
        eq(holidayWorkRequests.userId, userId),
        eq(holidayWorkRequests.status, "APPROVED"),
        eq(holidayWorkRequests.compensationPreference, "EXTRA_PAY"),
        gte(holidayWorkRequests.requestDate, monthStart),
        lte(holidayWorkRequests.requestDate, monthEnd)
      ),
      columns: { id: true, requestDate: true, type: true },
    });

    const eligibleDates: string[] = [];
    for (const req of approvedRequests) {
      const att = await db.query.attendance.findFirst({
        where: and(
          eq(attendance.userId, userId),
          eq(attendance.orgId, session.orgId),
          eq(attendance.date, req.requestDate)
        ),
        columns: { workHours: true },
      });
      const hours = parseFloat(att?.workHours ?? "0");
      if (hours >= FULL_DAY_HOURS) {
        eligibleDates.push(req.requestDate);
      }
    }

    const basicSalary = parseFloat(salary?.basicSalary ?? "0");
    const hraPercentage = parseFloat(salary?.hraPercentage ?? "50");
    const specialAllowance = parseFloat(salary?.specialAllowance ?? "0");
    const hra = (basicSalary * hraPercentage) / 100;
    const ctcMonthly = basicSalary + hra + specialAllowance;
    const calDays = calendarDaysInMonth(month);
    const dailyRate = calDays > 0 ? ctcMonthly / calDays : 0;
    const overtimeDays = eligibleDates.length;
    const overtimeAmount = Math.round(dailyRate * overtimeDays);

    return ok({
      userId,
      month,
      overtimeDays,
      overtimeAmount,
      dailyRate: Math.round(dailyRate),
      eligibleDates,
    });
  });
}
