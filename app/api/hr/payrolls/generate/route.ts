import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls, salaryStructures, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { computeTotalDeductionsAndNet, roundInr } from "@/lib/hr/payroll-calculations";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

const generateSinglePayrollSchema = z.object({
  userId: z.string(),
  month: z.string(),
  lopDays: z.number().optional(),
  halfDays: z.number().optional(),
  otherDeductions: z.number().optional(),
  bonus: z.number().optional(),
  overtimeType: z.enum(["days", "hours"]).optional(),
  overtimeDays: z.number().optional(),
  overtimeHours: z.number().optional(),
  overtimeAmount: z.number().optional(),
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

    const employee = await db.query.users.findFirst({
      where: eq(users.id, body.userId),
      columns: { monthlySalary: true },
    });
    const monthlySalary = parseFloat(employee?.monthlySalary || "0") || 0;

    const basicSalary = Number(salary.basicSalary);
    const hraPercentage = Number(salary.hraPercentage || 50);
    const allowances = Number(salary.allowances || 0);
    const deductions = Number(salary.deductions || 0);

    const hra = (basicSalary * hraPercentage) / 100;
    const grossSalary = basicSalary + hra + allowances + (body.bonus || 0) + (body.overtimeAmount || 0);

    const { totalDeductions, netSalary } = computeTotalDeductionsAndNet({
      month: body.month,
      monthlySalary,
      grossSalary,
      salaryStructureDeductions: deductions,
      lopDays: body.lopDays ?? 0,
      halfDays: body.halfDays ?? 0,
      otherDeductions: body.otherDeductions ?? 0,
    });

    const [payroll] = await db
      .insert(payrolls)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        month: body.month,
        basicSalary: basicSalary.toString(),
        hra: hra.toString(),
        allowances: (allowances + (body.bonus || 0)).toString(),
        deductions: String(totalDeductions),
        grossSalary: String(roundInr(grossSalary)),
        netSalary: String(netSalary),
        status: "DRAFT",
        generatedBy: session.user.id,
        overtimeType: body.overtimeType,
        overtimeDays: body.overtimeDays?.toString(),
        overtimeHours: body.overtimeHours?.toString(),
        overtimeAmount: body.overtimeAmount?.toString(),
      })
      .returning();

    void createAuditLog({
      action: "hr.payroll_generated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(payroll.id),
      targetType: "payroll",
      metadata: { employeeId: body.userId, month: body.month, netSalary: roundInr(netSalary) },
    }).catch(() => {});

    return ok({ success: true });
  });
}
