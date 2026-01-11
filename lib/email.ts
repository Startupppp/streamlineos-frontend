import sgMail from "@sendgrid/mail";
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
  getHolidayAnnouncementEmailTemplate,
  getCompanyAnnouncementEmailTemplate,
  getExpenseSubmittedEmailTemplate,
  getExpenseApprovedEmailTemplate,
  getExpenseRejectedEmailTemplate,
  getExpensePaidEmailTemplate,
  getDocumentExpiryReminderEmailTemplate,
} from "./email-templates";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(options: EmailOptions) {
  // Priority: EMAIL_FROM_ADDRESS > SENDGRID_FROM_EMAIL > default
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.SENDGRID_FROM_EMAIL || "noreply@vaivammcapital.com";
  
  if (!process.env.SENDGRID_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[EMAIL SKIPPED - No SendGrid API Key] To: ${options.to}, Subject: ${options.subject}`);
    }
    return Promise.resolve();
  }

  try {
    await sgMail.send({
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });
    if (process.env.NODE_ENV === "development") {
      console.log(`[EMAIL SENT] To: ${options.to}, Subject: ${options.subject}`);
    }
  } catch (error) {
    console.error(`[EMAIL ERROR] To: ${options.to}, Subject: ${options.subject}`, error);
    throw error;
  }
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
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
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

export { sendEmail };
