import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls, users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { format } from "date-fns";
import { sendEmail } from "@/lib/email";
import { generatePayslipPdf } from "@/lib/payslip-pdf";
import { getPayslipEmailTemplate } from "@/lib/email-templates/hr";
import { logger } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit-log";

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
    if (existing.status !== "APPROVED") {
      return err("Payroll must be approved before marking as paid.", 400);
    }

    await db
      .update(payrolls)
      .set({ status: "PAID" })
      .where(eq(payrolls.id, payrollId));

    void createAuditLog({
      action: "hr.payroll_paid",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(payrollId),
      targetType: "payroll",
      metadata: { employeeId: existing.userId, month: existing.month, netSalary: existing.netSalary },
    }).catch(() => {});

    // Send payslip email with PDF attachment (non-blocking)
    void (async () => {
      try {
        const [employee, org] = await Promise.all([
          db.query.users.findFirst({ where: eq(users.id, existing.userId) }),
          db.query.organizations.findFirst({ where: eq(organizations.id, session.orgId) }),
        ]);

        if (!employee?.email) return;

        const monthLabel = existing.month
          ? format(new Date(existing.month + "-01"), "MMMM yyyy")
          : "Unknown Month";

        const basic = parseFloat(existing.basicSalary || "0");
        const hra = parseFloat(existing.hra || "0");
        const allowances = parseFloat(existing.allowances || "0");
        const overtimeAmount = parseFloat(existing.overtimeAmount || "0");
        const grossSalary = parseFloat(existing.grossSalary || "0");
        const deductions = parseFloat(existing.deductions || "0");
        const netSalary = parseFloat(existing.netSalary || "0");

        const orgAddress = org?.address;
        const addressLine = [orgAddress?.city, orgAddress?.state, orgAddress?.country]
          .filter(Boolean)
          .join(", ");

        const bank = employee.bankDetails;
        const maskedAccount = bank?.accountNumber
          ? "XXXX" + bank.accountNumber.slice(-4)
          : "—";

        const [pdfBuffer, emailContent] = await Promise.all([
          generatePayslipPdf({
            orgName: org?.name ?? "Company",
            orgAddress: addressLine || undefined,
            employeeName: employee.name ?? "Employee",
            employeeId: employee.employeeId ?? undefined,
            designation: employee.designation ?? undefined,
            department: employee.team ?? employee.role ?? undefined,
            panNumber: employee.taxId ?? undefined,
            pfUan: bank?.pfUanNumber ?? undefined,
            bankName: bank?.bankName ?? undefined,
            maskedAccount,
            ifsc: bank?.ifsc ?? undefined,
            joiningDate: employee.joiningDate
              ? format(new Date(employee.joiningDate), "dd MMM yyyy")
              : undefined,
            monthLabel,
            payDate: format(new Date(), "dd MMM yyyy"),
            basicSalary: basic,
            hra,
            allowances,
            overtimeAmount,
            grossSalary,
            deductions,
            netSalary,
          }),
          Promise.resolve(
            getPayslipEmailTemplate({
              employeeName: employee.name ?? "Employee",
              month: monthLabel,
              netSalary: netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
              orgName: org?.name ?? "Company",
            })
          ),
        ]);

        await sendEmail({
          to: employee.email,
          subject: `Your Payslip for ${monthLabel} — ${org?.name ?? "Company"}`,
          html: emailContent.html,
          attachments: [
            {
              filename: `Payslip-${(employee.name ?? "employee").replace(/\s+/g, "-")}-${existing.month ?? "unknown"}.pdf`,
              content: pdfBuffer,
              type: "application/pdf",
            },
          ],
        });
      } catch (e) {
        logger.error("Failed to send payslip email", { payrollId, error: e });
      }
    })();

    return ok({ success: true });
  });
}
