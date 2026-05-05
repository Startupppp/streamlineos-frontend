import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  payrolls,
  salaryStructures,
  holidayWorkRequests,
  attendance,
  salaryLoans,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  calendarDaysInMonth,
  roundInr,
  PROFESSIONAL_TAX_INR,
  computeStatutory,
  computeProratedSalary,
} from "@/lib/hr/payroll-calculations";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

const FULL_DAY_HOURS = 8;

const generateSinglePayrollSchema = z.object({
  userId: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  lopDays: z.number().min(0).default(0),
  halfDays: z.number().min(0).default(0),
  bonus: z.number().min(0).default(0),
  otherDeductions: z.number().min(0).default(0),
});

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, generateSinglePayrollSchema);

    const salary = await db.query.salaryStructures.findFirst({
      where: and(
        eq(salaryStructures.userId, body.userId),
        eq(salaryStructures.orgId, session.orgId),
        eq(salaryStructures.isActive, true)
      ),
    });

    if (!salary) {
      return err("No active salary structure found for this employee.", 400);
    }

    // Pull every salary structure that overlaps the payroll month so a mid-month
    // revision (OPEN-02 to OPEN-04) is pro-rated correctly.
    const monthLastDay = calendarDaysInMonth(body.month);
    const monthEndStr = `${body.month}-${String(monthLastDay).padStart(2, "0")}`;
    const monthStartStr = `${body.month}-01`;
    const overlappingStructures = await db.query.salaryStructures.findMany({
      where: and(
        eq(salaryStructures.userId, body.userId),
        eq(salaryStructures.orgId, session.orgId),
        sql`${salaryStructures.effectiveFrom} <= ${monthEndStr}`,
        sql`(${salaryStructures.effectiveTo} IS NULL OR ${salaryStructures.effectiveTo} >= ${monthStartStr})`
      ),
      orderBy: [salaryStructures.effectiveFrom],
    });

    const existingPayroll = await db.query.payrolls.findFirst({
      where: and(
        eq(payrolls.orgId, session.orgId),
        eq(payrolls.userId, body.userId),
        eq(payrolls.month, body.month)
      ),
      columns: { id: true, status: true },
    });
    if (existingPayroll) {
      return err(
        `Payroll for ${body.month} already exists (id: ${existingPayroll.id}, status: ${existingPayroll.status}). Delete the existing DRAFT first.`,
        409
      );
    }

    const [yr, mo] = body.month.split("-").map(Number);
    const monthStart = `${body.month}-01`;
    const lastDay = new Date(yr, mo, 0).getDate();
    const monthEnd = `${body.month}-${String(lastDay).padStart(2, "0")}`;

    const ptAmount = parseFloat(salary.professionalTax ?? String(PROFESSIONAL_TAX_INR));
    const structureDeductions = parseFloat(salary.deductions ?? "0");

    const calDays = calendarDaysInMonth(body.month);
    const prorated = computeProratedSalary(
      body.month,
      overlappingStructures.map((s) => ({
        basicSalary: parseFloat(s.basicSalary),
        hraPercentage: parseFloat(s.hraPercentage ?? "50"),
        specialAllowance: parseFloat(s.specialAllowance ?? "0"),
        effectiveFrom: s.effectiveFrom,
        effectiveTo: s.effectiveTo,
      }))
    );
    const basicSalary = prorated.basicSalary;
    const hra = prorated.hra;
    const specialAllowance = prorated.specialAllowance;
    const ctcMonthly = prorated.ctcMonthly;
    const dailyRate = calDays > 0 ? ctcMonthly / calDays : 0;

    const saturdayMult = parseFloat(salary.saturdayOtMultiplier ?? "1.00");
    const sundayMult = parseFloat(salary.sundayOtMultiplier ?? "2.00");
    const holidayMult = parseFloat(salary.holidayOtMultiplier ?? "2.00");

    // Auto-compute overtime from approved EXTRA_PAY holiday work requests.
    // OT amount per day = dailyRate × (multiplier for that day's type).
    const approvedHwrs = await db.query.holidayWorkRequests.findMany({
      where: and(
        eq(holidayWorkRequests.orgId, session.orgId),
        eq(holidayWorkRequests.userId, body.userId),
        eq(holidayWorkRequests.status, "APPROVED"),
        eq(holidayWorkRequests.compensationPreference, "EXTRA_PAY"),
        gte(holidayWorkRequests.requestDate, monthStart),
        lte(holidayWorkRequests.requestDate, monthEnd)
      ),
      columns: { id: true, requestDate: true, type: true },
    });

    let overtimeDays = 0;
    let overtimeAmountUnrounded = 0;
    for (const hwr of approvedHwrs) {
      const att = await db.query.attendance.findFirst({
        where: and(
          eq(attendance.userId, body.userId),
          eq(attendance.orgId, session.orgId),
          eq(attendance.date, hwr.requestDate)
        ),
        columns: { workHours: true },
      });
      if (parseFloat(att?.workHours ?? "0") >= FULL_DAY_HOURS) {
        overtimeDays++;
        const mult =
          hwr.type === "HOLIDAY" ? holidayMult : hwr.type === "SUNDAY" ? sundayMult : saturdayMult;
        overtimeAmountUnrounded += dailyRate * mult;
      }
    }
    const overtimeAmount = roundInr(overtimeAmountUnrounded);

    // Auto-pull advance recovery from active salary loan (oldest active first)
    const activeLoan = await db.query.salaryLoans.findFirst({
      where: and(
        eq(salaryLoans.orgId, session.orgId),
        eq(salaryLoans.userId, body.userId),
        eq(salaryLoans.status, "ACTIVE")
      ),
      columns: { emiAmount: true, paidEmis: true, totalEmis: true },
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
    const loanHasBalance =
      activeLoan != null &&
      (activeLoan.totalEmis ?? 0) > 0 &&
      (activeLoan.paidEmis ?? 0) < (activeLoan.totalEmis ?? 0);
    const advanceRecoveryAmount = loanHasBalance ? parseFloat(activeLoan!.emiAmount ?? "0") : 0;

    const grossSalary = roundInr(basicSalary + hra + specialAllowance + overtimeAmount + (body.bonus || 0));

    const lopAmount = roundInr(dailyRate * (body.lopDays || 0));
    const halfDayLopAmount = roundInr((dailyRate / 2) * (body.halfDays || 0));

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
        halfDayLopAmount +
        ptAmount +
        structureDeductions +
        advanceRecoveryAmount +
        (body.otherDeductions || 0) +
        statutory.pfEmployee +
        statutory.esiEmployee
    );
    const netSalary = roundInr(grossSalary - totalDeductions);

    const [payroll] = await db
      .insert(payrolls)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        month: body.month,
        basicSalary: basicSalary.toString(),
        hra: hra.toString(),
        specialAllowance: specialAllowance.toString(),
        allowances: (body.bonus || 0).toString(),
        lopDays: (body.lopDays || 0).toString(),
        lopAmount: lopAmount.toString(),
        halfDays: (body.halfDays || 0).toString(),
        halfDayAmount: halfDayLopAmount.toString(),
        ptAmount: ptAmount.toString(),
        pfEmployee: statutory.pfEmployee.toString(),
        pfEmployer: statutory.pfEmployer.toString(),
        esiEmployee: statutory.esiEmployee.toString(),
        esiEmployer: statutory.esiEmployer.toString(),
        advanceRecoveryAmount: advanceRecoveryAmount.toString(),
        otherDeductions: (body.otherDeductions || 0).toString(),
        structureDeductions: structureDeductions.toString(),
        deductions: totalDeductions.toString(),
        grossSalary: grossSalary.toString(),
        netSalary: netSalary.toString(),
        status: "DRAFT",
        generatedBy: session.user.id,
        overtimeType: overtimeDays > 0 ? "days" : undefined,
        overtimeDays: overtimeDays.toString(),
        overtimeAmount: overtimeAmount.toString(),
      })
      .returning();

    void createAuditLog({
      action: "hr.payroll_generated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(payroll.id),
      targetType: "payroll",
      metadata: { employeeId: body.userId, month: body.month, netSalary },
    }).catch(() => {});

    return ok({ success: true, payrollId: payroll.id });
  });
}
