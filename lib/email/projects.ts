import { sendEmail } from "./sender";
import { baseUrl } from "./sender";
import {
  getProjectAssignmentEmailTemplate,
  getTicketAssignmentEmailTemplate,
  getTicketReviewRequestEmailTemplate,
  getTicketChangesRequestedEmailTemplate,
} from "../email-templates";

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
