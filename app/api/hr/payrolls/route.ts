import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getPayrolls } from "@/server/queries/hr";
import { db } from "@/lib/db";
import {
  payrolls,
  salaryStructures,
  organizationMembers,
  users,
  attendance,
} from "@/lib/db/schema";
import { eq, and, inArray, gte, lte, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";
import { z } from "zod";

const generatePayrollSchema = z.object({
  month: z.string().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await getPayrolls(session.orgId, session.user.id);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can generate payroll.", 403);
    }

    const body = await parseBody(req, generatePayrollSchema);
    if (!body.month || !/^\d{4}-\d{2}$/.test(body.month)) {
      return err("month is required in YYYY-MM format.", 400);
    }

    const memberships = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, session.orgId),
    });

    const memberUserIds = memberships.map((m) => m.userId).filter(Boolean) as string[];
    if (memberUserIds.length === 0) return ok({ generated: 0 });

    const [allSalaryStructures, existingPayrolls, allUsers] = await Promise.all([
      db.query.salaryStructures.findMany({
        where: and(
          inArray(salaryStructures.userId, memberUserIds),
          eq(salaryStructures.orgId, session.orgId),
          eq(salaryStructures.isActive, true)
        ),
      }),
      db.query.payrolls.findMany({
        where: and(
          inArray(payrolls.userId, memberUserIds),
          eq(payrolls.month, body.month),
          eq(payrolls.orgId, session.orgId)
        ),
      }),
      db.query.users.findMany({
        where: inArray(users.id, memberUserIds),
        columns: { id: true, monthlySalary: true },
      }),
    ]);

    const salaryMap = new Map(allSalaryStructures.map((s) => [s.userId, s]));
    const userMap = new Map(allUsers.map((u) => [u.id, u.monthlySalary]));
    const existingPayrollUserIds = new Set(existingPayrolls.map((p) => p.userId));

    const [yearStr, monthStr] = body.month.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    let totalBusinessDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, month - 1, d).getDay();
      if (day !== 0 && day !== 6) totalBusinessDays++;
    }
    if (totalBusinessDays <= 0) totalBusinessDays = 22;

    const monthStart = `${body.month}-01`;
    const monthEnd = `${body.month}-${String(daysInMonth).padStart(2, "0")}`;

    let attendanceMap = new Map<string, number>();
    try {
      const attendanceRecords = await db
        .select({
          userId: attendance.userId,
          daysPresent: sql<number>`count(*)`.as("days_present"),
        })
        .from(attendance)
        .where(
          and(
            eq(attendance.orgId, session.orgId),
            inArray(attendance.userId, memberUserIds),
            gte(attendance.date, monthStart),
            lte(attendance.date, monthEnd),
            sql`${attendance.status} IN ('PRESENT', 'HALF_DAY', 'LATE')`
          )
        )
        .groupBy(attendance.userId);
      for (const rec of attendanceRecords) {
        attendanceMap.set(rec.userId, Number(rec.daysPresent));
      }
    } catch (e) {
      logger.warn("Failed to fetch attendance data for payroll", {
        error: e instanceof Error ? e.message : "Unknown",
        month: body.month,
      });
    }

    const newPayrolls = memberUserIds
      .filter((uId) => {
        if (existingPayrollUserIds.has(uId)) return false;
        const hasSalaryStructure = salaryMap.has(uId);
        const hasMonthlySalary =
          userMap.has(uId) && parseFloat(userMap.get(uId) || "0") > 0;
        return hasSalaryStructure || hasMonthlySalary;
      })
      .map((uId) => {
        const salaryStructure = salaryMap.get(uId);
        const monthlySalaryStr = userMap.get(uId);
        const monthlySalary = monthlySalaryStr ? parseFloat(monthlySalaryStr) : 0;

        const basic = salaryStructure
          ? parseFloat(salaryStructure.basicSalary)
          : monthlySalary * 0.5;
        const hraPercentage = salaryStructure
          ? parseFloat(salaryStructure.hraPercentage || "40")
          : 40;
        const hra = salaryStructure ? basic * (hraPercentage / 100) : monthlySalary * 0.5;
        const allowances = salaryStructure
          ? parseFloat(salaryStructure.allowances || "0")
          : 0;
        let deductions = salaryStructure
          ? parseFloat(salaryStructure.deductions || "0")
          : 0;
        const gross = basic + hra + allowances;

        let lopDeduction = 0;
        const daysAttended = attendanceMap.get(uId);
        if (daysAttended !== undefined && daysAttended < totalBusinessDays) {
          const dailySalary = gross / totalBusinessDays;
          const absentDays = totalBusinessDays - daysAttended;
          lopDeduction = Math.round(dailySalary * absentDays * 100) / 100;
        }

        const totalDeductions = deductions + lopDeduction;
        const net = gross - totalDeductions;

        return {
          orgId: session.orgId,
          userId: uId,
          month: body.month!,
          basicSalary: basic.toString(),
          hra: hra.toString(),
          allowances: allowances.toString(),
          deductions: totalDeductions.toString(),
          grossSalary: gross.toString(),
          netSalary: net.toString(),
          status: "DRAFT" as const,
          generatedBy: session.user.id,
        };
      });

    if (newPayrolls.length > 0) {
      await db.insert(payrolls).values(newPayrolls);
    }

    return ok({ generated: newPayrolls.length });
  });
}
