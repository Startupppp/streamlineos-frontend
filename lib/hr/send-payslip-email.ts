import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { sendEmail } from "@/lib/email";
import { buildPayslipPdfDataFromPayroll, generatePayslipPdfWithEncryptionStatus } from "@/lib/payslip-pdf";
import { derivePayslipPassword } from "@/lib/hr/payslip-password";
import { getPayslipEmailTemplate } from "@/lib/email-templates/hr";
import { countApprovedLeaveDaysInMonth } from "@/server/queries/hr/payslip-leave-days";
import { logger } from "@/lib/logger";
import { appUrl } from "@/lib/app-url";

export type PayslipEmailError =
  | "no_email"
  | "missing_dob"
  | "pdf_not_encrypted"
  | "send_failed";

export type PayslipEmailResult = {
  emailSent: boolean;
  emailError?: PayslipEmailError;
};

type PayrollRow = {
  id: number;
  userId: string;
  month: string;
  netSalary: string | null;
  leaveDaysDisplay: string | null;
} & Record<string, unknown>;

const ORG_FULL_NAME_HEADER = "Vaivamm Capital Advisors LLP";

/**
 * Builds the encrypted payslip PDF for `payroll` and emails it to the
 * employee. Used by mark-paid (auto-dispatch) and the resend endpoint so
 * both flows go through the same code path — no drift between initial send
 * and retry.
 *
 * Returns a structured result instead of throwing; callers decide whether
 * to surface the error to HR. Errors are also written to `logger.error`.
 */
export async function sendPayslipEmailForPayroll(
  orgId: string,
  payroll: PayrollRow
): Promise<PayslipEmailResult> {
  try {
    const [employee, org] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, payroll.userId) }),
      db.query.organizations.findFirst({ where: eq(organizations.id, orgId) }),
    ]);

    if (!employee?.email) {
      return { emailSent: false, emailError: "no_email" };
    }

    const password = derivePayslipPassword({ dateOfBirth: employee.dateOfBirth });
    if (!password) {
      return { emailSent: false, emailError: "missing_dob" };
    }

    const monthLabel = payroll.month
      ? format(new Date(payroll.month + "-01"), "MMMM yyyy")
      : "Unknown Month";

    const leaveDays =
      payroll.leaveDaysDisplay != null
        ? parseFloat(payroll.leaveDaysDisplay)
        : payroll.month && payroll.userId
          ? await countApprovedLeaveDaysInMonth(orgId, payroll.userId, payroll.month)
          : 0;

    const pdfBase = buildPayslipPdfDataFromPayroll(
      payroll as unknown as Parameters<typeof buildPayslipPdfDataFromPayroll>[0],
      employee,
      org ?? { name: null, address: null },
      {
        leaveDaysInMonth: leaveDays,
        showPaidBadge: true,
        orgFullNameOverride: ORG_FULL_NAME_HEADER,
      }
    );
    const { buffer: pdfBuffer, encrypted } = await generatePayslipPdfWithEncryptionStatus({
      ...pdfBase,
      password,
    });

    if (!encrypted) {
      return { emailSent: false, emailError: "pdf_not_encrypted" };
    }

    const netSalary = parseFloat(payroll.netSalary || "0");
    const emailContent = getPayslipEmailTemplate({
      employeeName: employee.name ?? "Employee",
      month: monthLabel,
      netSalary: netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
      orgName: org?.name ?? "Company",
      passwordProtected: true,
      payslipUrl: `${appUrl}/api/hr/payrolls/${payroll.id}/download`,
    });

    await sendEmail({
      to: employee.email,
      subject: `Your Payslip for ${monthLabel} — ${org?.name ?? "Company"}`,
      html: emailContent.html,
      attachments: [
        {
          filename: `Payslip-${(employee.name ?? "employee").replace(/\s+/g, "-")}-${payroll.month ?? "unknown"}.pdf`,
          content: pdfBuffer,
          type: "application/pdf",
        },
      ],
    });

    return { emailSent: true };
  } catch (e) {
    logger.error("Failed to send payslip email", { payrollId: payroll.id, error: e });
    return { emailSent: false, emailError: "send_failed" };
  }
}
