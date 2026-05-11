import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls, users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { format } from "date-fns";
import { sendEmail } from "@/lib/email";
import { buildPayslipPdfDataFromPayroll, generatePayslipPdfWithEncryptionStatus } from "@/lib/payslip-pdf";
import { derivePayslipPassword } from "@/lib/hr/payslip-password";
import { getPayslipEmailTemplate } from "@/lib/email-templates/hr";
import { countApprovedLeaveDaysInMonth } from "@/server/queries/hr/payslip-leave-days";
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

    let emailSent = false;
    let emailError: "no_email" | "send_failed" | "missing_dob" | "pdf_not_encrypted" | null = null;

    try {
      const [employee, org] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, existing.userId) }),
        db.query.organizations.findFirst({ where: eq(organizations.id, session.orgId) }),
      ]);

      if (!employee?.email) {
        emailError = "no_email";
      } else {
        const monthLabel = existing.month
          ? format(new Date(existing.month + "-01"), "MMMM yyyy")
          : "Unknown Month";

        const netSalary = parseFloat(existing.netSalary || "0");

        const password = derivePayslipPassword({ dateOfBirth: employee.dateOfBirth });
        if (!password) {
          emailError = "missing_dob";
        } else {
          const leaveDays =
            existing.month && existing.userId
              ? await countApprovedLeaveDaysInMonth(session.orgId, existing.userId, existing.month)
              : 0;

          const pdfBase = buildPayslipPdfDataFromPayroll(
            existing,
            employee,
            org ?? { name: null, address: null },
            { leaveDaysInMonth: leaveDays }
          );
          const { buffer: pdfBuffer, encrypted } = await generatePayslipPdfWithEncryptionStatus({
            ...pdfBase,
            password,
          });

          if (!encrypted) {
            emailError = "pdf_not_encrypted";
          } else {
            const emailContent = getPayslipEmailTemplate({
              employeeName: employee.name ?? "Employee",
              month: monthLabel,
              netSalary: netSalary.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              }),
              orgName: org?.name ?? "Company",
              passwordProtected: true,
            });

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
            emailSent = true;
          }
        }
      }
    } catch (e) {
      logger.error("Failed to send payslip email", { payrollId, error: e });
      emailError = "send_failed";
    }

    return ok({
      success: true,
      emailSent,
      ...(emailError ? { emailError } : {}),
    });
  });
}
