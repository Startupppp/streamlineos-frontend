import { withModuleAbility, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { sendPayrollApprovedEmail } from "@/lib/email";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
  return withModuleAbility("hr", "manage", "hr:payrolls", async (session) => {
    const { payrollId: id } = await params;
    const payrollId = Number(id);
    if (!payrollId) return err("Invalid payroll ID.", 400);

    const existing = await db.query.payrolls.findFirst({
      where: and(eq(payrolls.id, payrollId), eq(payrolls.orgId, session.orgId)),
    });

    if (!existing) return err("Payroll not found.", 404);

    await db
      .update(payrolls)
      .set({
        status: "APPROVED",
        approvedBy: session.user.id,
      })
      .where(eq(payrolls.id, payrollId));

    try {
      await createAuditLog({
        action: "hr.payroll_approved",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(payrollId),
        targetType: "payroll",
        metadata: { employeeId: existing.userId, month: existing.month },
      });
    } catch {  }

    if (existing.userId) {
      try {
        const employee = await db.query.users.findFirst({
          where: eq(users.id, existing.userId),
          columns: { email: true, name: true },
        });
        if (employee?.email) {
          await sendPayrollApprovedEmail(
            employee.email,
            employee.name ?? "Employee",
            existing.month ?? "Current Month",
            session.user.name ?? "Admin"
          );
        }
      } catch {  }
    }

    return ok({ success: true });
  });
}
