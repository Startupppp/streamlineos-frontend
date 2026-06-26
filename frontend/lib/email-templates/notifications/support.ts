import { getEmailTemplate, appUrl, escapeHtml } from "../base";

export function getTicketCreatedEmailTemplate(
  assigneeName: string,
  ticketTitle: string,
  priority: string,
  creatorName: string,
  ticketId: number
): string {
  const priorityColor = priority === "URGENT" ? "#dc2626" : priority === "HIGH" ? "#ea580c" : priority === "MEDIUM" ? "#ca8a04" : "#65a30d";
  const content = `
    <h2 class="email-title">🎫 New Support Ticket Assigned</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(assigneeName)}</strong>, a new support ticket has been assigned to you.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">#${ticketId} — ${escapeHtml(ticketTitle)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Priority:</span>
        <span class="credential-value" style="color: ${priorityColor}; font-weight: 600;">${escapeHtml(priority)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Created by:</span>
        <span class="credential-value">${escapeHtml(creatorName)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${appUrl}/support/${ticketId}" class="email-button">View Ticket</a>
    </div>
  `;
  return getEmailTemplate({ title: "Support Ticket Assigned", content });
}

export function getTicketReplyEmailTemplate(
  recipientName: string,
  ticketTitle: string,
  ticketId: number,
  authorName: string,
  messagePreview: string
): string {
  const content = `
    <h2 class="email-title">💬 New Reply on Ticket #${ticketId}</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(recipientName)}</strong>, there's a new reply on your support ticket.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">${escapeHtml(ticketTitle)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Reply from:</span>
        <span class="credential-value">${escapeHtml(authorName)}</span>
      </div>
    </div>
    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #475569; font-size: 14px; margin: 0; font-style: italic;">"${escapeHtml(messagePreview.slice(0, 200))}${messagePreview.length > 200 ? "..." : ""}"</p>
    </div>
    <div style="text-align: center;">
      <a href="${appUrl}/support/${ticketId}" class="email-button">View Full Conversation</a>
    </div>
  `;
  return getEmailTemplate({ title: "New Reply on Support Ticket", content });
}

export function getTicketStatusEmailTemplate(
  recipientName: string,
  ticketTitle: string,
  ticketId: number,
  newStatus: string,
  updatedBy: string
): string {
  const statusColor = newStatus === "RESOLVED" || newStatus === "CLOSED" ? "#16a34a" : newStatus === "IN_PROGRESS" ? "#2563eb" : "#ca8a04";
  const content = `
    <h2 class="email-title">🔄 Ticket Status Updated</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(recipientName)}</strong>, the status of your support ticket has been updated.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">#${ticketId} — ${escapeHtml(ticketTitle)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">New Status:</span>
        <span class="credential-value" style="color: ${statusColor}; font-weight: 600;">${escapeHtml(newStatus)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Updated by:</span>
        <span class="credential-value">${escapeHtml(updatedBy)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${appUrl}/support/${ticketId}" class="email-button">View Ticket</a>
    </div>
  `;
  return getEmailTemplate({ title: "Ticket Status Updated", content });
}

export function getHelpdeskTicketEmailTemplate(
  recipientName: string,
  ticketTitle: string,
  category: string,
  priority: string,
  creatorName: string
): string {
  const priorityColor = priority === "URGENT" ? "#dc2626" : priority === "HIGH" ? "#ea580c" : priority === "MEDIUM" ? "#ca8a04" : "#65a30d";
  const content = `
    <h2 class="email-title">🎫 New Helpdesk Ticket</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(recipientName)}</strong>, a new helpdesk ticket has been submitted.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Title:</span>
        <span class="credential-value">${escapeHtml(ticketTitle)}</span>
      </div>
      ${category ? `
      <div class="credential-item">
        <span class="credential-label">Category:</span>
        <span class="credential-value">${escapeHtml(category)}</span>
      </div>` : ""}
      <div class="credential-item">
        <span class="credential-label">Priority:</span>
        <span class="credential-value" style="color: ${priorityColor}; font-weight: 600;">${escapeHtml(priority)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Submitted by:</span>
        <span class="credential-value">${escapeHtml(creatorName)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${appUrl}/hr/helpdesk" class="email-button">View Ticket</a>
    </div>
  `;
  return getEmailTemplate({ title: "New Helpdesk Ticket", content });
}
