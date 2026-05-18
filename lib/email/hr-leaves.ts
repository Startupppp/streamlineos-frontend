import { sendEmail } from "./sender";
import { baseUrl } from "./sender";
import {
  getLeaveRequestEmailTemplate,
  getWfhRequestEmailTemplate,
  getLeaveStatusUpdateEmailTemplate,
  getLeaveCancellationEmailTemplate,
} from "../email-templates";

export async function sendWfhRequestEmail(
  approverEmail: string,
  approverName: string,
  employeeName: string,
  wfhDate: string,
  reason: string
) {
  const reviewUrl = `${baseUrl}/hr/leaves`;
  await sendEmail({
    to: approverEmail,
    subject: `WFH Request: ${employeeName} - Vaivamm Capital`,
    html: getWfhRequestEmailTemplate(
      approverName,
      employeeName,
      wfhDate,
      reason,
      reviewUrl
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
