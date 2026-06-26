import { sendEmail } from "./sender";
import { appUrl } from "../app-url";
import {
  getExpenseSubmittedEmailTemplate,
  getExpenseApprovedEmailTemplate,
  getExpenseRejectedEmailTemplate,
  getExpensePaidEmailTemplate,
  getDocumentExpiryReminderEmailTemplate,
  getAssetAssignedEmailTemplate,
  getPayrollApprovedEmailTemplate,
} from "../email-templates";
import type { MonthlyExpenseReportRow } from "../email-templates";
import { getWeeklyAttendanceReportTemplate, getMonthlyExpenseReportTemplate } from "../email-templates";
import { generateMonthlyExpenseReportXlsx } from "../monthly-expense-report-xlsx";

export async function sendExpenseSubmittedEmail(
  approverEmail: string,
  approverName: string,
  employeeName: string,
  category: string,
  amount: string,
  description: string
) {
  const expenseLink = `${appUrl}/hr/expenses`;
  await sendEmail({
    to: approverEmail,
    subject: `New Expense Claim from ${employeeName}`,
    html: getExpenseSubmittedEmailTemplate(
      approverName,
      employeeName,
      category,
      amount,
      description,
      expenseLink
    ),
  });
}

export async function sendExpenseApprovedEmail(
  employeeEmail: string,
  employeeName: string,
  category: string,
  amount: string,
  approverName: string
) {
  await sendEmail({
    to: employeeEmail,
    subject: `Expense Claim Approved - ₹${amount}`,
    html: getExpenseApprovedEmailTemplate(employeeName, category, amount, approverName),
  });
}

export async function sendExpenseRejectedEmail(
  employeeEmail: string,
  employeeName: string,
  category: string,
  amount: string,
  approverName: string,
  reason: string
) {
  await sendEmail({
    to: employeeEmail,
    subject: `Expense Claim Rejected - ₹${amount}`,
    html: getExpenseRejectedEmailTemplate(employeeName, category, amount, approverName, reason),
  });
}

export async function sendExpensePaidEmail(
  employeeEmail: string,
  employeeName: string,
  category: string,
  amount: string,
  transactionRef?: string
) {
  await sendEmail({
    to: employeeEmail,
    subject: `Expense Reimbursed - ₹${amount}`,
    html: getExpensePaidEmailTemplate(employeeName, category, amount, transactionRef),
  });
}

export async function sendDocumentExpiryReminderEmail(
  email: string,
  employeeName: string,
  documentName: string,
  documentType: string,
  expiryDate: string,
  daysRemaining: number
) {
  await sendEmail({
    to: email,
    subject: `Document Expiring Soon: ${documentName}`,
    html: getDocumentExpiryReminderEmailTemplate(
      employeeName,
      documentName,
      documentType,
      expiryDate,
      daysRemaining
    ),
  });
}


export async function sendWeeklyAttendanceReportEmail(
  weekRange: string,
  orgName: string,
  rows: { department: string; name: string; totalHours: string; autoCheckoutDays: number; overtimeDays: number; daysPresent: number }[],
  recipientEmails: string[]
) {
  if (recipientEmails.length === 0) return;

  const subject = `Attendance Report - ${weekRange}`;
  const html = getWeeklyAttendanceReportTemplate(weekRange, orgName, rows);

  for (const email of recipientEmails) {
    await sendEmail({ to: email, subject, html });
  }
}

export async function sendMonthlyExpenseReportEmail(
  monthLabel: string,
  orgName: string,
  rows: MonthlyExpenseReportRow[],
  summary: { totalAmount: string; totalCount: number; pendingCount: number; approvedCount: number; paidCount: number; rejectedCount: number },
  recipientEmails: string[]
) {
  if (recipientEmails.length === 0) return;

  const subject = `Monthly Expense Report - ${monthLabel}`;
  const html = getMonthlyExpenseReportTemplate(monthLabel, orgName, rows, summary);
  const xlsxBuffer = await generateMonthlyExpenseReportXlsx(monthLabel, orgName, rows, summary);
  const safeMonthLabel = monthLabel.replace(/\s+/g, "-");
  const xlsxFilename = `Monthly-Expense-Report-${safeMonthLabel}.xlsx`;

  for (const email of recipientEmails) {
    await sendEmail({
      to: email,
      subject,
      html,
      attachments: [
        {
          filename: xlsxFilename,
          content: xlsxBuffer,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
  }
}

export async function sendAssetAssignedEmail(
  email: string,
  employeeName: string,
  assetName: string,
  assetType: string,
  serialNumber: string | null
) {
  await sendEmail({
    to: email,
    subject: `Asset Assigned: ${assetName}`,
    html: getAssetAssignedEmailTemplate(employeeName, assetName, assetType, serialNumber),
  });
}

export async function sendPayrollApprovedEmail(
  email: string,
  employeeName: string,
  month: string,
  approverName: string
) {
  await sendEmail({
    to: email,
    subject: `Payroll Approved — ${month}`,
    html: getPayrollApprovedEmailTemplate(employeeName, month, approverName),
  });
}
