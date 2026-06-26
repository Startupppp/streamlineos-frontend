export { sendEmail } from "./sender";
export type { EmailOptions, EmailAttachment } from "./sender";

export {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangeConfirmationEmail,
  sendAccountLockedEmail,
  sendNewDeviceLoginEmail,
  sendPasswordExpiryWarningEmail,
} from "./auth";

export {
  sendInvitationEmail,
  sendWelcomeEmail,
  sendAccountDeactivationEmail,
  sendLeaveRequestEmail,
  sendLeaveStatusUpdateEmail,
  sendLeaveCancellationEmail,
  sendHolidayAnnouncementEmail,
  sendCompanyAnnouncementEmail,
  sendBulkHolidayAnnouncement,
  sendBulkCompanyAnnouncement,
  sendExpenseSubmittedEmail,
  sendExpenseApprovedEmail,
  sendExpenseRejectedEmail,
  sendExpensePaidEmail,
  sendDocumentExpiryReminderEmail,
  sendWeeklyAttendanceReportEmail,
  sendMonthlyExpenseReportEmail,
  sendResignationSubmittedEmail,
  sendResignationApprovedEmail,
  sendTerminationEmail,
  sendWorkLogStatusEmail,
  sendOnboardingWelcomeEmail,
  sendOnboardingTaskEmail,
  sendOnboardingCompleteEmployeeEmail,
  sendOnboardingCompleteHrEmail,
  sendAssetAssignedEmail,
  sendPayrollApprovedEmail,
  sendReviewAssignedEmail,
} from "./hr";

export {
  sendDealStageChangeEmail,
  sendLeadAssignedEmail,
} from "./crm";

export {
  sendProjectAssignmentEmail,
  sendTicketAssignmentEmail,
  sendTicketReviewRequestEmail,
  sendTicketChangesRequestedEmail,
  sendSupportTicketCreatedEmail,
  sendSupportTicketReplyEmail,
  sendSupportTicketStatusEmail,
  sendTaskAssignedEmail,
  sendHelpdeskTicketEmail,
} from "./notifications";
