import { getEmailTemplate, baseUrl, logoUrl } from "./base";

export function getProjectAssignmentEmailTemplate(
  memberName: string,
  projectName: string,
  projectKey: string,
  projectUrl: string,
  assignedBy?: string
): string {
  const content = `
    <h2 class="email-title">📋 You've Been Added to a Project</h2>
    <p class="email-text">
      ${assignedBy ? `<strong>${assignedBy}</strong> has added you` : 'You have been added'}
      to the project <strong>${projectName}</strong>.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Project:</span>
        <span class="credential-value">${projectName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Project Key:</span>
        <span class="credential-value">${projectKey}</span>
      </div>
    </div>

    <p class="email-text">
      You can now view and contribute to this project. Access the project board to see tickets,
      sprints, and collaborate with your team.
    </p>

    <div style="text-align: center;">
      <a href="${projectUrl}" class="email-button">
        View Project
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      <strong>What's Next:</strong>
    </p>
    <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 16px 0;">
      <li>Review the project details and objectives</li>
      <li>Check your assigned tickets</li>
      <li>Collaborate with your team members</li>
      <li>Update ticket statuses as you progress</li>
    </ul>
  `;

  return getEmailTemplate({
    title: `Added to Project: ${projectName} - Vaivamm Capital`,
    preheader: `You've been added to ${projectName}`,
    content,
  });
}

export function getTicketAssignmentEmailTemplate(
  assigneeName: string,
  ticketTitle: string,
  ticketType: string,
  ticketPriority: string,
  projectName: string,
  ticketUrl: string,
  createdBy: string
): string {
  const priorityColors: Record<string, string> = {
    LOW: '#22c55e',
    MEDIUM: '#eab308',
    HIGH: '#f97316',
    URGENT: '#ef4444',
  };

  const priorityColor = priorityColors[ticketPriority] || '#64748b';

  const content = `
    <h2 class="email-title">🎫 New Ticket Assigned to You</h2>
    <p class="email-text">
      <strong>${createdBy}</strong> has created a ticket and assigned it to you.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">${ticketTitle}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Project:</span>
        <span class="credential-value">${projectName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Type:</span>
        <span class="credential-value">${ticketType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Priority:</span>
        <span style="color: ${priorityColor}; font-weight: 600; display: inline-block; margin-left: 8px;">
          ${ticketPriority}
        </span>
      </div>
    </div>

    ${ticketPriority === 'URGENT' || ticketPriority === 'HIGH' ? `
    <div class="security-notice">
      <p class="security-text">
        <strong>High Priority:</strong> This ticket requires immediate attention.
        Please review and update the status as soon as possible.
      </p>
    </div>
    ` : ''}

    <div style="text-align: center;">
      <a href="${ticketUrl}" class="email-button">
        View Ticket Details
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      Check the status and details in the CRM system. Keep your team updated on your progress!
    </p>
  `;

  return getEmailTemplate({
    title: `Ticket Assigned: ${ticketTitle} - Vaivamm Capital`,
    preheader: `${createdBy} assigned you a ${ticketPriority.toLowerCase()} priority ticket`,
    content,
  });
}

export function getTicketReviewRequestEmailTemplate(
  reviewerName: string,
  ticketTitle: string,
  ticketType: string,
  projectName: string,
  ticketUrl: string,
  completedBy: string,
  comment?: string
): string {
  const content = `
    <h2 class="email-title">👀 Ticket Ready for Your Review</h2>
    <p class="email-text">
      <strong>${completedBy}</strong> has completed their work and moved a ticket to
      <span style="display: inline-block; background: #eab308; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 13px;">IN REVIEW</span>.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">${ticketTitle}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Project:</span>
        <span class="credential-value">${projectName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Type:</span>
        <span class="credential-value">${ticketType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Completed By:</span>
        <span class="credential-value">${completedBy}</span>
      </div>
    </div>

    ${comment ? `
    <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">💬 Latest Comment:</p>
      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${comment}</p>
    </div>
    ` : ''}

    <div style="text-align: center;">
      <a href="${ticketUrl}" class="email-button">
        Review Work & Add Comments
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      <strong>You can review:</strong>
    </p>
    <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 16px 0;">
      <li>View all comments and work updates</li>
      <li>Check attached images, videos, and documents</li>
      <li>Review external links and deployments</li>
      <li>Add your feedback and comments</li>
      <li>Approve (mark as DONE) or request changes (back to IN_PROGRESS)</li>
    </ul>
  `;

  return getEmailTemplate({
    title: `Review Requested: ${ticketTitle} - Vaivamm Capital`,
    preheader: `${completedBy} completed work on ${ticketTitle} and needs your review`,
    content,
  });
}

export function getTicketChangesRequestedEmailTemplate(
  assigneeName: string,
  ticketTitle: string,
  projectName: string,
  ticketUrl: string,
  reviewerName: string,
  comment?: string
): string {
  const content = `
    <h2 class="email-title">🔄 Changes Requested on Your Ticket</h2>
    <p class="email-text">
      <strong>${reviewerName}</strong> has reviewed your work and moved the ticket back to
      <span style="display: inline-block; background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 13px;">IN PROGRESS</span>.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">${ticketTitle}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Project:</span>
        <span class="credential-value">${projectName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Reviewed By:</span>
        <span class="credential-value">${reviewerName}</span>
      </div>
    </div>

    ${comment ? `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e; font-size: 14px;">💬 Review Feedback:</p>
      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${comment}</p>
    </div>
    ` : ''}

    <div class="security-notice">
      <p class="security-text">
        <strong>Action Required:</strong> Please review the feedback, make the requested changes,
        and move the ticket back to IN_REVIEW when ready.
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${ticketUrl}" class="email-button">
        View Feedback & Update Ticket
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      Check all comments in the CRM to understand what needs to be fixed or improved.
    </p>
  `;

  return getEmailTemplate({
    title: `Changes Requested: ${ticketTitle} - Vaivamm Capital`,
    preheader: `${reviewerName} requested changes on ${ticketTitle}`,
    content,
  });
}
