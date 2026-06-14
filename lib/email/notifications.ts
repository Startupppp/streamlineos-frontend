import { sendEmail } from "./sender";
import { appUrl } from "../app-url";
import {
  getProjectAssignmentEmailTemplate,
  getTicketAssignmentEmailTemplate,
  getTicketReviewRequestEmailTemplate,
  getTicketChangesRequestedEmailTemplate,
  getTicketCreatedEmailTemplate,
  getTicketReplyEmailTemplate,
  getTicketStatusEmailTemplate,
  getTaskAssignedEmailTemplate,
  getHelpdeskTicketEmailTemplate,
} from "../email-templates";

export async function sendProjectAssignmentEmail(
  email: string,
  memberName: string,
  projectName: string,
  projectKey: string,
  projectId: number,
  assignedBy?: string
) {
  const projectUrl = `${appUrl}/projects/${projectId}`;
  await sendEmail({
    to: email,
    subject: `Added to Project: ${projectName} - StreamlineOS`,
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
  const ticketUrl = `${appUrl}/projects/${projectId}?ticket=${ticketId}`;
  await sendEmail({
    to: email,
    subject: `Ticket Assigned: ${ticketTitle} - StreamlineOS`,
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
  const ticketUrl = `${appUrl}/projects/${projectId}?ticket=${ticketId}`;
  await sendEmail({
    to: email,
    subject: `Review Requested: ${ticketTitle} - StreamlineOS`,
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
  const ticketUrl = `${appUrl}/projects/${projectId}?ticket=${ticketId}`;
  await sendEmail({
    to: email,
    subject: `Changes Requested: ${ticketTitle} - StreamlineOS`,
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

export async function sendHelpdeskTicketEmail(
  email: string,
  recipientName: string,
  ticketTitle: string,
  category: string,
  priority: string,
  creatorName: string
) {
  await sendEmail({
    to: email,
    subject: `Helpdesk Ticket: ${ticketTitle}`,
    html: getHelpdeskTicketEmailTemplate(recipientName, ticketTitle, category, priority, creatorName),
  });
}
