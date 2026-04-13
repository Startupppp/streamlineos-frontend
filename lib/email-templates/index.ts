export { getEmailTemplate, baseUrl, logoUrl } from "./base";
export type { EmailTemplateProps } from "./base";

export {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getWelcomeEmailTemplate,
  getPasswordChangeConfirmationEmailTemplate,
  getAccountDeactivationEmailTemplate,
  getAccountLockedEmailTemplate,
  getNewDeviceLoginEmailTemplate,
  getPasswordExpiryWarningEmailTemplate,
} from "./auth";

export {
  getInvitationEmailTemplate,
  getHolidayAnnouncementEmailTemplate,
  getCompanyAnnouncementEmailTemplate,
} from "./organization";

export {
  getProjectAssignmentEmailTemplate,
  getTicketAssignmentEmailTemplate,
  getTicketReviewRequestEmailTemplate,
  getTicketChangesRequestedEmailTemplate,
} from "./project";

export {
  getLeaveRequestEmailTemplate,
  getLeaveStatusUpdateEmailTemplate,
  getLeaveCancellationEmailTemplate,
  getDocumentExpiryReminderEmailTemplate,
  getResignationSubmittedEmailTemplate,
  getResignationApprovedEmailTemplate,
  getTerminationEmailTemplate,
  getCandidateRejectionEmail,
  getPayslipEmailTemplate,
} from "./hr";

export {
  getExpenseSubmittedEmailTemplate,
  getExpenseApprovedEmailTemplate,
  getExpenseRejectedEmailTemplate,
  getExpensePaidEmailTemplate,
} from "./expense";

export {
  getWeeklyAttendanceReportTemplate,
  getMonthlyExpenseReportTemplate,
} from "./reports";
export type { MonthlyExpenseReportRow } from "./reports";

export {
  getSelfReviewReminderEmail,
  getManagerReviewReminderEmail,
  getReviewPublishedEmail,
  getGoalSettingReminderEmail,
} from "./appraisal";

export {
  getLeadWelcomeEmail,
  getFollowUpReminderEmail,
  getDealWonEmail,
  getSlaBreachAlertEmail,
  getClientOnboardingEmail,
} from "./crm";

export {
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
  getHelpdeskTicketEmailTemplate,
  getAssetAssignedEmailTemplate,
  getPayrollApprovedEmailTemplate,
} from "./notifications";
