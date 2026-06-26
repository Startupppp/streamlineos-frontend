import { withModuleAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls, salaryStructures } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

const generateSinglePayrollSchema = z.object({
  userId: z.string(),
  month: z.string(),
  lopDays: z.number().min(0).optional(),
  halfDays: z.number().min(0).optional(),
  otherDeductions: z.number().min(0).optional(),
  bonus: z.number().min(0).optional(),
  overtimeType: z.enum(["days", "hours"]).optional(),
  overtimeDays: z.number().min(0).optional(),
  overtimeHours: z.number().min(0).optional(),
  overtimeAmount: z.number().min(0).optional(),
});

export async function POST(req: NextRequest) {
  return withModuleAbility("hr", "generate", "hr:payroll", async (session) => {
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

    const existingPayroll = await db.query.payrolls.findFirst({
      where: and(
        eq(payrolls.orgId, session.orgId),
        eq(payrolls.userId, body.userId),
        eq(payrolls.month, body.month),
      ),
      columns: { id: true },
    });
    if (existingPayroll) {
      return err(`Payroll for this employee and month (${body.month}) already exists.`, 409);
    }

    const basicSalary = Number(salary.basicSalary);
    const hraPercentage = Number(salary.hraPercentage || 50);
    const allowances = Number(salary.allowances || 0);
    const deductions = Number(salary.deductions || 0);

    const round2 = (n: number) => Math.round(n * 100) / 100;

    const hra = round2((basicSalary * hraPercentage) / 100);
    const grossSalary = round2(basicSalary + hra + allowances + (body.bonus || 0) + (body.overtimeAmount || 0));

    const [payYear, payMonth] = body.month.split("-").map(Number);
    const daysInMonth = new Date(payYear, payMonth, 0).getDate();

    const PROFESSIONAL_TAX = 200;
    const lopDeduction = body.lopDays ? round2((basicSalary / daysInMonth) * body.lopDays) : 0;
    const halfDayDeduction = body.halfDays ? round2(((basicSalary / daysInMonth) * body.halfDays) / 2) : 0;
    const totalDeductions = round2(deductions + lopDeduction + halfDayDeduction + (body.otherDeductions || 0) + PROFESSIONAL_TAX);

    const netSalary = round2(grossSalary - totalDeductions);

    const [payroll] = await db
      .insert(payrolls)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        month: body.month,
        basicSalary: basicSalary.toString(),
        hra: hra.toString(),
        allowances: (allowances + (body.bonus || 0)).toString(),
        deductions: totalDeductions.toString(),
        grossSalary: grossSalary.toString(),
        netSalary: netSalary.toString(),
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
      metadata: { employeeId: body.userId, month: body.month, netSalary: netSalary },
    }).catch(() => {});

    return ok({ success: true }, 201);
  });
}
