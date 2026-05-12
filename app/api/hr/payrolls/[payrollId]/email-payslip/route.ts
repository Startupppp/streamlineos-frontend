import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { sendPayslipEmailForPayroll } from "@/lib/hr/send-payslip-email";

/**
 * Manual retry for the payslip email. Used when auto-dispatch from mark-paid
 * failed (no DOB at the time, transient SMTP error, etc.) or when an employee
 * loses the original mail. Only PAID payrolls are eligible — sending a
 * payslip for a non-finalised row would leak draft figures.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
  return withAdmin(async (session) => {
    const { payrollId: id } = await params;
    const payrollId = Number(id);
    if (!payrollId) return err("Invalid payroll ID.", 400);

    const existing = await db.query.payrolls.findFirst({
      where: and(eq(payrolls.id, payrollId), eq(payrolls.orgId, session.orgId)),
    });

    if (!existing) return err("Payroll not found.", 404);
    if (existing.status !== "PAID") {
      return err("Payslip email can only be sent for PAID payrolls.", 400);
    }

    const { emailSent, emailError } = await sendPayslipEmailForPayroll(session.orgId, existing);

    try {
      await createAuditLog({
        action: "hr.payroll_paid",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(payrollId),
        targetType: "payroll",
        metadata: {
          employeeId: existing.userId,
          month: existing.month,
          action: "resend_email",
          emailSent,
          emailError: emailError ?? null,
        },
      });
    } catch {  }

    return ok({
      success: true,
      emailSent,
      ...(emailError ? { emailError } : {}),
    });
  });
}
