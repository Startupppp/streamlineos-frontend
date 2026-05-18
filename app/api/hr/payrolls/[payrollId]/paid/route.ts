import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { sendPayslipEmailForPayroll } from "@/lib/hr/send-payslip-email";

export async function PATCH(
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
    if (existing.status === "PAID") {
      return err("Payroll is already marked as paid.", 400);
    }
    if (existing.status !== "APPROVED") {
      return err("Payroll must be approved before marking as paid.", 400);
    }

    await db
      .update(payrolls)
      .set({
        status: "PAID",
        paidBy: session.user.id,
        paidAt: new Date(),
      })
      .where(eq(payrolls.id, payrollId));

    try {
      await createAuditLog({
        action: "hr.payroll_paid",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(payrollId),
        targetType: "payroll",
        metadata: { employeeId: existing.userId, month: existing.month, netSalary: existing.netSalary },
      });
    } catch {  }

    const { emailSent, emailError } = await sendPayslipEmailForPayroll(session.orgId, existing);

    return ok({
      success: true,
      emailSent,
      ...(emailError ? { emailError } : {}),
    });
  });
}
