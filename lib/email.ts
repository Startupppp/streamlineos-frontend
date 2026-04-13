import sgMail from "@sendgrid/mail";
import { logger } from "./logger";
import { appUrl } from "./app-url";
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getInvitationEmailTemplate,
  getWelcomeEmailTemplate,
  getProjectAssignmentEmailTemplate,
  getTicketAssignmentEmailTemplate,
  getTicketReviewRequestEmailTemplate,
  getTicketChangesRequestedEmailTemplate,
  getLeaveRequestEmailTemplate,
  getLeaveStatusUpdateEmailTemplate,
  getLeaveCancellationEmailTemplate,
  getPasswordChangeConfirmationEmailTemplate,
  getAccountDeactivationEmailTemplate,
  getAccountLockedEmailTemplate,
  getNewDeviceLoginEmailTemplate,
  getPasswordExpiryWarningEmailTemplate,
  getHolidayAnnouncementEmailTemplate,
  getCompanyAnnouncementEmailTemplate,
  getExpenseSubmittedEmailTemplate,
  getExpenseApprovedEmailTemplate,
  getExpenseRejectedEmailTemplate,
  getExpensePaidEmailTemplate,
  getDocumentExpiryReminderEmailTemplate,
  getWeeklyAttendanceReportTemplate,
  getMonthlyExpenseReportTemplate,
  getResignationSubmittedEmailTemplate,
  getResignationApprovedEmailTemplate,
  getTerminationEmailTemplate,
  getWorkLogApprovedEmailTemplate,
  getWorkLogRejectedEmailTemplate,
  getOnboardingWelcomeEmailTemplate,
  getOnboardingTaskEmailTemplate,
  getTicketCreatedEmailTemplate,
  getTicketReplyEmailTemplate,
  getTicketStatusEmailTemplate,
  getTaskAssignedEmailTemplate,
  getDealStageChangeEmailTemplate,
  getLeadAssignedEmailTemplate,
  getReviewAssignedEmailTemplate,
} from "./email-templates";
import type { MonthlyExpenseReportRow } from "./email-templates";
import { generateMonthlyExpenseReportXlsx } from "./monthly-expense-report-xlsx";

const baseUrl = appUrl;

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  type: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function isTransientError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const code = (error as { code?: number | string }).code;
    if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "EAI_AGAIN") {
      return true;
    }
    const statusCode = (error as { code?: number; statusCode?: number }).statusCode ?? (typeof code === "number" ? code : undefined);
    if (typeof statusCode === "number") {
      if (statusCode >= 500 && statusCode < 600) return true;
      if (statusCode >= 400 && statusCode < 500) return false;
    }
  }
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendEmail(options: EmailOptions) {
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.SENDGRID_FROM_EMAIL || "noreply@vaivammcapital.com";

  if (!process.env.SENDGRID_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      logger.info("Email skipped - No SendGrid API Key", { to: options.to, subject: options.subject });
    }
    return Promise.resolve();
  }

  const attachments = options.attachments?.map((a) => ({
    content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
    filename: a.filename,
    type: a.type,
    disposition: "attachment" as const,
  }));

  const msg = {
    to: options.to,
    from: fromEmail,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ""),
    ...(attachments?.length ? { attachments } : {}),
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sgMail.send(msg);
      if (process.env.NODE_ENV === "development") {
        logger.info("Email sent", { to: options.to, subject: options.subject });
      }
      return;
    } catch (error) {
      lastError = error;

      if (!isTransientError(error)) {
        logger.error("Email send failed with non-retryable error", {
          to: options.to,
          subject: options.subject,
          attempt,
          error,
        });
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const backoff = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn(`Email send failed, retrying (attempt ${attempt}/${MAX_RETRIES})`, {
          to: options.to,
          subject: options.subject,
          attempt,
          nextRetryMs: backoff,
          error,
        });
        await delay(backoff);
      }
    }
  }

  logger.error("Email send failed after all retries exhausted", {
    to: options.to,
    subject: options.subject,
    totalAttempts: MAX_RETRIES,
    error: lastError,
  });
  throw lastError;
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify Your Email - Vaivamm Capital",
    html: getVerificationEmailTemplate(verificationUrl),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset Your Password - Vaivamm Capital",
    html: getPasswordResetEmailTemplate(resetUrl),
  });
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  organizationName: string,
  inviterName?: string
) {
  const invitationUrl = `${baseUrl}/invitation/${token}`;
  await sendEmail({
    to: email,
    subject: `Invitation to join ${organizationName} - Vaivamm Capital`,
    html: getInvitationEmailTemplate(invitationUrl, organizationName, inviterName),
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  tempPassword: string,
  loginUrl: string = `${baseUrl}/signin`
) {
  await sendEmail({
    to: email,
    subject: "Welcome to Vaivamm Capital - Your Account Details",
    html: getWelcomeEmailTemplate(name, email, tempPassword, loginUrl),
  });
}

export async function sendProjectAssignmentEmail(
  email: string,
  memberName: string,
  projectName: string,
  projectKey: string,
  projectId: number,
  assignedBy?: string
) {
  const projectUrl = `${baseUrl}/projects/${projectId}`;
  await sendEmail({
    to: email,
    subject: `Added to Project: ${projectName} - Vaivamm Capital`,
    html: getProjectAssignmentEmailTemplate(memberName, projectName, projectKey, projectUrl, assignedBy),
  });
}

export async function sendTicketAssignmentEmail(
  email: string,
  assigneeName: string,
  ticketTitle: string,
  ticketType: string,
  ticketPriority: string,
  projectName: string,
  projectId: number,
  ticketId: number,
  createdBy: string
) {
  const ticketUrl = `${baseUrl}/projects/${projectId}?ticket=${ticketId}`;
  await sendEmail({
    to: email,
    subject: `Ticket Assigned: ${ticketTitle} - Vaivamm Capital`,
    html: getTicketAssignmentEmailTemplate(
      assigneeName,
      ticketTitle,
      ticketType,
      ticketPriority,
      projectName,
      ticketUrl,
      createdBy
    ),
  });
}

export async function sendTicketReviewRequestEmail(
  email: string,
  reviewerName: string,
  ticketTitle: string,
  ticketType: string,
  projectName: string,
  projectId: number,
  ticketId: number,
  completedBy: string,
  comment?: string
) {
  const ticketUrl = `${baseUrl}/projects/${projectId}?ticket=${ticketId}`;
  await sendEmail({
    to: email,
    subject: `Review Requested: ${ticketTitle} - Vaivamm Capital`,
    html: getTicketReviewRequestEmailTemplate(
      reviewerName,
      ticketTitle,
      ticketType,
      projectName,
      ticketUrl,
      completedBy,
      comment
    ),
  });
}

export async function sendTicketChangesRequestedEmail(
  email: string,
  assigneeName: string,
  ticketTitle: string,
  projectName: string,
  projectId: number,
  ticketId: number,
  reviewerName: string,
  comment?: string
) {
  const ticketUrl = `${baseUrl}/projects/${projectId}?ticket=${ticketId}`;
  await sendEmail({
    to: email,
    subject: `Changes Requested: ${ticketTitle} - Vaivamm Capital`,
    html: getTicketChangesRequestedEmailTemplate(
      assigneeName,
      ticketTitle,
      projectName,
      ticketUrl,
      reviewerName,
      comment
    ),
  });
}

export async function sendLeaveRequestEmail(
  email: string,
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string
) {
  const leaveUrl = `${baseUrl}/hr/leaves`;
  await sendEmail({
    to: email,
    subject: `Leave Request: ${employeeName} - Vaivamm Capital`,
    html: getLeaveRequestEmailTemplate(
      approverName,
      employeeName,
      leaveType,
      startDate,
      endDate,
      reason,
      leaveUrl
    ),
  });
}

export async function sendLeaveStatusUpdateEmail(
  email: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  status: "APPROVED" | "REJECTED",
  approverName: string,
  rejectionReason?: string
) {
  await sendEmail({
    to: email,
    subject: `Leave Request ${status}: ${leaveType} - Vaivamm Capital`,
    html: getLeaveStatusUpdateEmailTemplate(
      employeeName,
      leaveType,
      startDate,
      endDate,
      status,
      approverName,
      rejectionReason
    ),
  });
}

export async function sendLeaveCancellationEmail(
  email: string,
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string
) {
  await sendEmail({
    to: email,
    subject: `Leave Cancelled: ${employeeName} - Vaivamm Capital`,
    html: getLeaveCancellationEmailTemplate(
      approverName,
      employeeName,
      leaveType,
      startDate,
      endDate
    ),
  });
}

export async function sendPasswordChangeConfirmationEmail(
  email: string,
  userName: string
) {
  await sendEmail({
    to: email,
    subject: 'Password Changed Successfully - Vaivamm Capital',
    html: getPasswordChangeConfirmationEmailTemplate(userName),
  });
}

export async function sendAccountDeactivationEmail(
  email: string,
  employeeName: string,
  deactivatedBy: string,
  reason?: string
) {
  await sendEmail({
    to: email,
    subject: 'Account Deactivated - Vaivamm Capital',
    html: getAccountDeactivationEmailTemplate(employeeName, deactivatedBy, reason),
  });
}

export async function sendHolidayAnnouncementEmail(
  email: string,
  holidayName: string,
  holidayDate: string,
  message?: string
) {
  await sendEmail({
    to: email,
    subject: `Holiday Tomorrow: ${holidayName} - Vaivamm Capital`,
    html: getHolidayAnnouncementEmailTemplate(holidayName, holidayDate, message),
  });
}

export async function sendCompanyAnnouncementEmail(
  email: string,
  subject: string,
  message: string,
  announcedBy: string
) {
  await sendEmail({
    to: email,
    subject: `Announcement: ${subject} - Vaivamm Capital`,
    html: getCompanyAnnouncementEmailTemplate(subject, message, announcedBy),
  });
}

export async function sendBulkHolidayAnnouncement(
  emails: string[],
  holidayName: string,
  holidayDate: string,
  message?: string
) {
  const emailPromises = emails.map(email =>
    sendHolidayAnnouncementEmail(email, holidayName, holidayDate, message)
  );

  await Promise.allSettled(emailPromises);
}

export async function sendBulkCompanyAnnouncement(
  emails: string[],
  subject: string,
  message: string,
  announcedBy: string
) {
  const emailPromises = emails.map(email =>
    sendCompanyAnnouncementEmail(email, subject, message, announcedBy)
  );

  await Promise.allSettled(emailPromises);
}

export async function sendExpenseSubmittedEmail(
  approverEmail: string,
  approverName: string,
  employeeName: string,
  category: string,
  amount: string,
  description: string
) {
  const expenseLink = `${baseUrl}/hr/expenses`;
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

export async function sendPayslipGeneratedEmail(
  email: string,
  employeeName: string,
  month: string,
  netSalary: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payslip Generated</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Vaivamm Capital</h1>
        <p style="color: #dbeafe; margin: 5px 0 0 0;">Capital Advisors LLP</p>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1e40af; margin-top: 0;">Your Payslip is Ready! 📋</h2>

        <p>Dear <strong>${employeeName}</strong>,</p>

        <p>Your payslip for <strong>${month}</strong> has been generated and is now available for viewing.</p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #166534; font-size: 14px;">Net Salary</p>
          <p style="margin: 5px 0 0 0; color: #166534; font-size: 28px; font-weight: bold;">₹${netSalary}</p>
        </div>

        <p>You can view and download your detailed payslip by logging into your account and navigating to <strong>My Payslips</strong>.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/hr/my-payslips"
             style="background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Payslip
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions regarding your salary, please contact the HR department.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This is an automated email from Vaivamm Capital. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Your Payslip for ${month} is Ready`,
    html,
  });
}

export async function sendWeeklyAttendanceReportEmail(
  weekRange: string,
  orgName: string,
  rows: { name: string; totalHours: string; autoCheckoutDays: number; overtimeDays: number; daysPresent: number }[],
  recipientEmails: string[]
) {
  if (recipientEmails.length === 0) return;

  const subject = `Weekly Attendance Report - ${weekRange}`;
  const html = getWeeklyAttendanceReportTemplate(weekRange, orgName, rows);

  for (const email of recipientEmails) {
    await sendEmail({
      to: email,
      subject,
      html,
    });
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

export async function sendResignationSubmittedEmail(
  hrEmail: string,
  hrName: string,
  employeeName: string,
  employeeDesignation: string,
  submissionDate: string,
  lastWorkingDate: string,
  noticePeriodDays: number,
  reason: string
) {
  const reviewUrl = `${baseUrl}/hr/exit`;
  await sendEmail({
    to: hrEmail,
    subject: `Resignation Submitted: ${employeeName} - Vaivamm Capital`,
    html: getResignationSubmittedEmailTemplate(
      hrName,
      employeeName,
      employeeDesignation,
      submissionDate,
      lastWorkingDate,
      noticePeriodDays,
      reason,
      reviewUrl
    ),
  });
}

export async function sendResignationApprovedEmail(
  employeeEmail: string,
  employeeName: string,
  approverName: string,
  lastWorkingDate: string,
  noticePeriodDays: number,
  submissionDate: string
) {
  const portalUrl = `${baseUrl}/hr/exit`;
  await sendEmail({
    to: employeeEmail,
    subject: `Resignation Accepted - Vaivamm Capital`,
    html: getResignationApprovedEmailTemplate(
      employeeName,
      approverName,
      lastWorkingDate,
      noticePeriodDays,
      submissionDate,
      portalUrl
    ),
  });
}

export async function sendTerminationEmail(
  employeeEmail: string,
  employeeName: string,
  employeeDesignation: string,
  terminationDate: string,
  terminatedBy: string,
  reason: string
) {
  const hrContactEmail = process.env.EMAIL_FROM_ADDRESS || "hr@vaivammcapital.com";
  await sendEmail({
    to: employeeEmail,
    subject: `Employment Termination Notice - Vaivamm Capital`,
    html: getTerminationEmailTemplate(
      employeeName,
      employeeDesignation,
      terminationDate,
      terminatedBy,
      reason,
      hrContactEmail
    ),
  });
}

export async function sendAccountLockedEmail(email: string, name: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Account Locked - Vaivamm Capital",
    html: getAccountLockedEmailTemplate(name),
  });
}

export async function sendNewDeviceLoginEmail(
  email: string,
  name: string,
  deviceInfo: { userAgent: string; ipAddress: string; time: string }
): Promise<void> {
  await sendEmail({
    to: email,
    subject: "New Device Sign-In Detected - Vaivamm Capital",
    html: getNewDeviceLoginEmailTemplate(name, deviceInfo),
  });
}

export async function sendPasswordExpiryWarningEmail(
  email: string,
  name: string,
  daysLeft: number
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Your Password Expires in ${daysLeft} Days - Vaivamm Capital`,
    html: getPasswordExpiryWarningEmailTemplate(name, daysLeft),
  });
}

// ─── Work Log Status ──────────────────────────────────────────────────────────

export async function sendWorkLogStatusEmail(
  email: string,
  employeeName: string,
  date: string,
  status: "APPROVED" | "REJECTED",
  approverName: string,
  rejectionReason?: string
) {
  const html =
    status === "APPROVED"
      ? getWorkLogApprovedEmailTemplate(employeeName, date, approverName)
      : getWorkLogRejectedEmailTemplate(employeeName, date, approverName, rejectionReason);

  await sendEmail({
    to: email,
    subject: `Work Log ${status === "APPROVED" ? "Approved" : "Rejected"} — ${date}`,
    html,
  });
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export async function sendOnboardingWelcomeEmail(
  email: string,
  employeeName: string,
  designation: string,
  joiningDate: string,
  taskCount: number
) {
  await sendEmail({
    to: email,
    subject: "Welcome to Vaivamm Capital — Your Onboarding Starts Now!",
    html: getOnboardingWelcomeEmailTemplate(employeeName, designation, joiningDate, taskCount),
  });
}

export async function sendOnboardingTaskEmail(
  email: string,
  recipientName: string,
  employeeName: string,
  taskRole: string,
  taskCount: number
) {
  await sendEmail({
    to: email,
    subject: `Onboarding Tasks Assigned: ${employeeName}`,
    html: getOnboardingTaskEmailTemplate(recipientName, employeeName, taskRole, taskCount),
  });
}

// ─── Support Ticket ───────────────────────────────────────────────────────────

export async function sendSupportTicketCreatedEmail(
  email: string,
  assigneeName: string,
  ticketTitle: string,
  priority: string,
  creatorName: string,
  ticketId: number
) {
  await sendEmail({
    to: email,
    subject: `Support Ticket Assigned: #${ticketId} — ${ticketTitle}`,
    html: getTicketCreatedEmailTemplate(assigneeName, ticketTitle, priority, creatorName, ticketId),
  });
}

export async function sendSupportTicketReplyEmail(
  email: string,
  recipientName: string,
  ticketTitle: string,
  ticketId: number,
  authorName: string,
  messagePreview: string
) {
  await sendEmail({
    to: email,
    subject: `New Reply on Ticket #${ticketId}: ${ticketTitle}`,
    html: getTicketReplyEmailTemplate(recipientName, ticketTitle, ticketId, authorName, messagePreview),
  });
}

export async function sendSupportTicketStatusEmail(
  email: string,
  recipientName: string,
  ticketTitle: string,
  ticketId: number,
  newStatus: string,
  updatedBy: string
) {
  await sendEmail({
    to: email,
    subject: `Ticket #${ticketId} ${newStatus}: ${ticketTitle}`,
    html: getTicketStatusEmailTemplate(recipientName, ticketTitle, ticketId, newStatus, updatedBy),
  });
}

// ─── Task Assignment ──────────────────────────────────────────────────────────

export async function sendTaskAssignedEmail(
  email: string,
  assigneeName: string,
  taskTitle: string,
  taskType: string,
  dueDate: string | null,
  creatorName: string,
  entityLabel?: string
) {
  await sendEmail({
    to: email,
    subject: `Task Assigned: ${taskTitle}`,
    html: getTaskAssignedEmailTemplate(assigneeName, taskTitle, taskType, dueDate, creatorName, entityLabel),
  });
}

// ─── Deal Stage Change ────────────────────────────────────────────────────────

export async function sendDealStageChangeEmail(
  email: string,
  recipientName: string,
  dealName: string,
  previousStage: string,
  newStage: string,
  dealValue: string | null,
  changedBy: string,
  dealId: number
) {
  await sendEmail({
    to: email,
    subject: `Deal ${newStage === "WON" ? "Won" : newStage === "LOST" ? "Lost" : "Updated"}: ${dealName}`,
    html: getDealStageChangeEmailTemplate(recipientName, dealName, previousStage, newStage, dealValue, changedBy, dealId),
  });
}

// ─── Lead Assignment ──────────────────────────────────────────────────────────

export async function sendLeadAssignedEmail(
  email: string,
  repName: string,
  leadName: string,
  source: string,
  priority: string,
  assignedBy: string
) {
  await sendEmail({
    to: email,
    subject: `New Lead Assigned: ${leadName}`,
    html: getLeadAssignedEmailTemplate(repName, leadName, source, priority, assignedBy),
  });
}

// ─── Performance Review ───────────────────────────────────────────────────────

export async function sendReviewAssignedEmail(
  email: string,
  employeeName: string,
  reviewerName: string,
  periodStart: string,
  periodEnd: string
) {
  await sendEmail({
    to: email,
    subject: "Performance Review Assigned — Vaivamm Capital",
    html: getReviewAssignedEmailTemplate(employeeName, reviewerName, periodStart, periodEnd),
  });
}

export { sendEmail };
