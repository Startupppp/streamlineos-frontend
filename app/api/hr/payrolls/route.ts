import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getPayrolls } from "@/server/queries/hr";
import { db } from "@/lib/db";
import {
  payrolls,
  salaryStructures,
  organizationMembers,
  attendance,
  holidayWorkRequests,
  salaryLoans,
} from "@/lib/db/schema";
import { eq, and, inArray, gte, lte, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { calendarDaysInMonth, roundInr, PROFESSIONAL_TAX_INR, computeStatutory } from "@/lib/hr/payroll-calculations";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";
import { z } from "zod";

const FULL_DAY_HOURS = 8;

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

    const [allSalaryStructures, existingPayrolls] = await Promise.all([
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
        columns: { userId: true },
      }),
    ]);

    const salaryMap = new Map(allSalaryStructures.map((s) => [s.userId, s]));
    const existingPayrollUserIds = new Set(existingPayrolls.map((p) => p.userId));

    const calDays = calendarDaysInMonth(body.month);
    const lastDay = calDays;
    const monthStart = `${body.month}-01`;
    const monthEnd = `${body.month}-${String(lastDay).padStart(2, "0")}`;

    // Per-user attendance aggregation: split full-day vs half-day so LOP and half-day
    // deductions can be computed separately. A user with 3 absent days and 2 half-days
    // should see both line items, not a conflated 4-day deduction.
    const fullPresentMap = new Map<string, number>();
    const halfDaysAttendanceMap = new Map<string, number>();
    try {
      const aggregated = await db
        .select({
          userId: attendance.userId,
          fullPresent: sql<number>`count(*) FILTER (WHERE ${attendance.status} IN ('PRESENT', 'LATE'))`.as("full_present"),
          halfDays: sql<number>`count(*) FILTER (WHERE ${attendance.status} = 'HALF_DAY')`.as("half_days"),
        })
        .from(attendance)
        .where(
          and(
            eq(attendance.orgId, session.orgId),
            inArray(attendance.userId, memberUserIds),
            gte(attendance.date, monthStart),
            lte(attendance.date, monthEnd)
          )
        )
        .groupBy(attendance.userId);
      for (const rec of aggregated) {
        fullPresentMap.set(rec.userId, Number(rec.fullPresent) || 0);
        halfDaysAttendanceMap.set(rec.userId, Number(rec.halfDays) || 0);
      }
    } catch (e) {
      logger.warn("Failed to fetch attendance data for payroll", {
        error: e instanceof Error ? e.message : "Unknown",
        month: body.month,
      });
    }

    // Approved EXTRA_PAY holiday work requests in this month, joined with attendance
    // to confirm the employee actually worked ≥ FULL_DAY_HOURS that day. Single grouped
    // query — no per-user loop.
    const overtimeMap = new Map<string, number>();
    try {
      const otRows = await db
        .select({
          userId: holidayWorkRequests.userId,
          eligibleDays: sql<number>`count(*) FILTER (WHERE COALESCE(${attendance.workHours}::numeric, 0) >= ${FULL_DAY_HOURS})`.as("eligible_days"),
        })
        .from(holidayWorkRequests)
        .leftJoin(
          attendance,
          and(
            eq(attendance.userId, holidayWorkRequests.userId),
            eq(attendance.orgId, holidayWorkRequests.orgId),
            eq(attendance.date, holidayWorkRequests.requestDate)
          )
        )
        .where(
          and(
            eq(holidayWorkRequests.orgId, session.orgId),
            inArray(holidayWorkRequests.userId, memberUserIds),
            eq(holidayWorkRequests.status, "APPROVED"),
            eq(holidayWorkRequests.compensationPreference, "EXTRA_PAY"),
            gte(holidayWorkRequests.requestDate, monthStart),
            lte(holidayWorkRequests.requestDate, monthEnd)
          )
        )
        .groupBy(holidayWorkRequests.userId);
      for (const r of otRows) overtimeMap.set(r.userId, Number(r.eligibleDays) || 0);
    } catch (e) {
      logger.warn("Failed to fetch overtime data for payroll", {
        error: e instanceof Error ? e.message : "Unknown",
      });
    }

    // Active loans with remaining balance — pull oldest-first per user
    const activeLoanMap = new Map<string, number>();
    try {
      const loans = await db.query.salaryLoans.findMany({
        where: and(
          eq(salaryLoans.orgId, session.orgId),
          inArray(salaryLoans.userId, memberUserIds),
          eq(salaryLoans.status, "ACTIVE")
        ),
        orderBy: (t, { asc }) => [asc(t.userId), asc(t.createdAt)],
      });
      for (const loan of loans) {
        if (activeLoanMap.has(loan.userId)) continue;
        const total = loan.totalEmis ?? 0;
        const paid = loan.paidEmis ?? 0;
        if (total > 0 && paid < total) {
          activeLoanMap.set(loan.userId, parseFloat(loan.emiAmount ?? "0"));
        }
      }
    } catch (e) {
      logger.warn("Failed to fetch loan data for payroll", {
        error: e instanceof Error ? e.message : "Unknown",
      });
    }

    const newPayrolls = memberUserIds
      .filter((uId) => !existingPayrollUserIds.has(uId) && salaryMap.has(uId))
      .map((uId) => {
        const salary = salaryMap.get(uId)!;

        const basicSalary = parseFloat(salary.basicSalary ?? "0");
        const hraPercentage = parseFloat(salary.hraPercentage ?? "50");
        const specialAllowance = parseFloat(salary.specialAllowance ?? "0");
        const ptAmount = parseFloat(salary.professionalTax ?? String(PROFESSIONAL_TAX_INR));
        const structureDeductions = parseFloat(salary.deductions ?? "0");

        const hra = roundInr((basicSalary * hraPercentage) / 100);
        const ctcMonthly = basicSalary + hra + specialAllowance;
        const dailyRate = calDays > 0 ? ctcMonthly / calDays : 0;

        // Bulk path infers LOP from attendance gap. Days a user neither punched in nor
        // marked half-day are treated as absent. Half-days deduct at half rate.
        const fullPresent = fullPresentMap.get(uId) ?? 0;
        const halfDaysCount = halfDaysAttendanceMap.get(uId) ?? 0;
        const accountedDays = fullPresent + halfDaysCount;
        const lopDays = Math.max(0, calDays - accountedDays - halfDaysCount);

        const lopAmount = roundInr(dailyRate * lopDays);
        const halfDayAmount = roundInr((dailyRate / 2) * halfDaysCount);

        const overtimeDays = overtimeMap.get(uId) ?? 0;
        const overtimeAmount = roundInr(dailyRate * overtimeDays);

        const advanceRecoveryAmount = activeLoanMap.get(uId) ?? 0;

        const grossSalary = roundInr(basicSalary + hra + specialAllowance + overtimeAmount);

        const statutory = computeStatutory(basicSalary, grossSalary, {
          pfApplicable: salary.pfApplicable ?? false,
          pfEmployeeRate: parseFloat(salary.pfEmployeeRate ?? "12"),
          pfEmployerRate: parseFloat(salary.pfEmployerRate ?? "12"),
          pfWageCeiling: parseFloat(salary.pfWageCeiling ?? "15000"),
          esiApplicable: salary.esiApplicable ?? false,
          esiEmployeeRate: parseFloat(salary.esiEmployeeRate ?? "0.75"),
          esiEmployerRate: parseFloat(salary.esiEmployerRate ?? "3.25"),
          esiWageCeiling: parseFloat(salary.esiWageCeiling ?? "21000"),
        });

        const totalDeductions = roundInr(
          lopAmount +
            halfDayAmount +
            ptAmount +
            structureDeductions +
            advanceRecoveryAmount +
            statutory.pfEmployee +
            statutory.esiEmployee
        );
        const netSalary = roundInr(grossSalary - totalDeductions);

        return {
          orgId: session.orgId,
          userId: uId,
          month: body.month!,
          basicSalary: basicSalary.toString(),
          hra: hra.toString(),
          specialAllowance: specialAllowance.toString(),
          allowances: "0",
          lopDays: lopDays.toString(),
          lopAmount: lopAmount.toString(),
          halfDays: halfDaysCount.toString(),
          halfDayAmount: halfDayAmount.toString(),
          ptAmount: ptAmount.toString(),
          pfEmployee: statutory.pfEmployee.toString(),
          pfEmployer: statutory.pfEmployer.toString(),
          esiEmployee: statutory.esiEmployee.toString(),
          esiEmployer: statutory.esiEmployer.toString(),
          advanceRecoveryAmount: advanceRecoveryAmount.toString(),
          otherDeductions: "0",
          structureDeductions: structureDeductions.toString(),
          deductions: totalDeductions.toString(),
          grossSalary: grossSalary.toString(),
          netSalary: netSalary.toString(),
          status: "DRAFT" as const,
          generatedBy: session.user.id,
          overtimeType: overtimeDays > 0 ? "days" : null,
          overtimeDays: overtimeDays.toString(),
          overtimeAmount: overtimeAmount.toString(),
        };
      });

    if (newPayrolls.length > 0) {
      await db.insert(payrolls).values(newPayrolls);
    }

    return ok({ generated: newPayrolls.length });
  });
}
