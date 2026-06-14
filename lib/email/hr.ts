import { sendEmail } from "./sender";
import { appUrl } from "../app-url";
import {
  getInvitationEmailTemplate,
  getWelcomeEmailTemplate,
  getAccountDeactivationEmailTemplate,
  getHolidayAnnouncementEmailTemplate,
  getCompanyAnnouncementEmailTemplate,
} from "../email-templates";

export async function sendInvitationEmail(
  email: string,
  token: string,
  organizationName: string,
  inviterName?: string
) {
  const invitationUrl = `${appUrl}/invitation/${token}`;
  await sendEmail({
    to: email,
    subject: `Invitation to join ${organizationName} - StreamlineOS`,
    html: getInvitationEmailTemplate(invitationUrl, organizationName, inviterName),
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  setupUrl: string
) {
  await sendEmail({
    to: email,
    subject: "Welcome to StreamlineOS — Set Up Your Account",
    html: getWelcomeEmailTemplate(name, email, setupUrl),
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
    subject: "Account Deactivated - StreamlineOS",
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
    subject: `Holiday Tomorrow: ${holidayName} - StreamlineOS`,
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
    subject: `Announcement: ${subject} - StreamlineOS`,
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

export {
  sendLeaveRequestEmail,
  sendLeaveStatusUpdateEmail,
  sendLeaveCancellationEmail,
  sendResignationSubmittedEmail,
  sendResignationApprovedEmail,
  sendTerminationEmail,
  sendWorkLogStatusEmail,
  sendOnboardingWelcomeEmail,
  sendOnboardingTaskEmail,
  sendOnboardingCompleteEmployeeEmail,
  sendOnboardingCompleteHrEmail,
  sendReviewAssignedEmail,
} from "./hr-leave";

export {
  sendExpenseSubmittedEmail,
  sendExpenseApprovedEmail,
  sendExpenseRejectedEmail,
  sendExpensePaidEmail,
  sendDocumentExpiryReminderEmail,
  sendPayslipGeneratedEmail,
  sendWeeklyAttendanceReportEmail,
  sendMonthlyExpenseReportEmail,
  sendAssetAssignedEmail,
  sendPayrollApprovedEmail,
} from "./hr-expense";
