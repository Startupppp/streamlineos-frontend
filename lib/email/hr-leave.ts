import { sendEmail } from "./sender";
import type { EmailAttachment } from "./sender";
import { appUrl } from "../app-url";
import {
  getLeaveRequestEmailTemplate,
  getLeaveStatusUpdateEmailTemplate,
  getLeaveCancellationEmailTemplate,
  getResignationSubmittedEmailTemplate,
  getResignationApprovedEmailTemplate,
  getTerminationEmailTemplate,
  getWorkLogApprovedEmailTemplate,
  getWorkLogRejectedEmailTemplate,
  getOnboardingWelcomeEmailTemplate,
  getOnboardingTaskEmailTemplate,
  getOnboardingCompleteEmployeeEmailTemplate,
  getOnboardingCompleteHrEmailTemplate,
  getReviewAssignedEmailTemplate,
} from "../email-templates";

export async function sendLeaveRequestEmail(
  email: string,
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string
) {
  const leaveUrl = `${appUrl}/hr/leaves`;
  await sendEmail({
    to: email,
    subject: `Leave Request: ${employeeName} - StreamlineOS`,
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
    subject: `Leave Request ${status}: ${leaveType} - StreamlineOS`,
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
    subject: `Leave Cancelled: ${employeeName} - StreamlineOS`,
    html: getLeaveCancellationEmailTemplate(
      approverName,
      employeeName,
      leaveType,
      startDate,
      endDate
    ),
  });
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
  const reviewUrl = `${appUrl}/hr/exit`;
  await sendEmail({
    to: hrEmail,
    subject: `Resignation Submitted: ${employeeName} - StreamlineOS`,
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
  const portalUrl = `${appUrl}/hr/exit`;
  await sendEmail({
    to: employeeEmail,
    subject: `Resignation Accepted - StreamlineOS`,
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
  reason: string,
  attachments?: EmailAttachment[]
) {
  const hrContactEmail = "hr@streamlineos.app";
  await sendEmail({
    to: employeeEmail,
    subject: `Employment Termination Notice - StreamlineOS`,
    html: getTerminationEmailTemplate(
      employeeName,
      employeeDesignation,
      terminationDate,
      terminatedBy,
      reason,
      hrContactEmail
    ),
    attachments,
  });
}

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

export async function sendOnboardingWelcomeEmail(
  email: string,
  employeeName: string,
  designation: string,
  joiningDate: string,
  taskCount: number
) {
  await sendEmail({
    to: email,
    subject: "Welcome to StreamlineOS — Your Onboarding Starts Now!",
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

export async function sendOnboardingCompleteEmployeeEmail(
  email: string,
  employeeName: string
) {
  await sendEmail({
    to: email,
    subject: "Onboarding Complete — Welcome to the Team!",
    html: getOnboardingCompleteEmployeeEmailTemplate(employeeName),
  });
}

export async function sendOnboardingCompleteHrEmail(
  email: string,
  hrName: string,
  employeeName: string
) {
  await sendEmail({
    to: email,
    subject: `Onboarding Complete: ${employeeName}`,
    html: getOnboardingCompleteHrEmailTemplate(hrName, employeeName),
  });
}

export async function sendReviewAssignedEmail(
  email: string,
  employeeName: string,
  reviewerName: string,
  periodStart: string,
  periodEnd: string
) {
  await sendEmail({
    to: email,
    subject: "Performance Review Assigned — StreamlineOS",
    html: getReviewAssignedEmailTemplate(employeeName, reviewerName, periodStart, periodEnd),
  });
}
