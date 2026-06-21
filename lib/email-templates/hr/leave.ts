import { getEmailTemplate, escapeHtml } from "../base";

export function getLeaveRequestEmailTemplate(
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string,
  leaveUrl: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sLeaveType = escapeHtml(leaveType);
  const sReason = escapeHtml(reason);
  const content = `
    <h2 class="email-title">📅 New Leave Request</h2>
    <p class="email-text">
      <strong>${sEmployee}</strong> has submitted a new leave request that requires your approval.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Employee:</span>
        <span class="credential-value">${sEmployee}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Leave Type:</span>
        <span class="credential-value">${sLeaveType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Duration:</span>
        <span class="credential-value">${startDate} to ${endDate}</span>
      </div>
    </div>

    <div style="background: #f8fafc; border-left: 4px solid #0f2b7f; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">💬 Reason:</p>
      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${sReason}</p>
    </div>

    <div style="text-align: center;">
      <a href="${leaveUrl}" class="email-button">
        Review Leave Request
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      You can approve or reject this request directly from the HR portal.
    </p>
  `;

  return getEmailTemplate({
    title: `Leave Request: ${sEmployee} - StreamlineOS`,
    preheader: `${sEmployee} requested ${sLeaveType} from ${startDate} to ${endDate}`,
    content,
  });
}

export function getLeaveStatusUpdateEmailTemplate(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  status: "APPROVED" | "REJECTED",
  approverName: string,
  rejectionReason?: string
): string {
  const isApproved = status === "APPROVED";
  const statusColor = isApproved ? "#22c55e" : "#ef4444";
  const sLeaveType = escapeHtml(leaveType);
  const sApprover = escapeHtml(approverName);
  const sRejection = rejectionReason ? escapeHtml(rejectionReason) : undefined;

  const content = `
    <h2 class="email-title">${isApproved ? "✅ Leave Request Approved" : "❌ Leave Request Rejected"}</h2>
    <p class="email-text">
      Your leave request for <strong>${sLeaveType}</strong> from <strong>${startDate} to ${endDate}</strong> has been <strong>${status.toLowerCase()}</strong> by ${sApprover}.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Status:</span>
        <span style="color: ${statusColor}; font-weight: 700; margin-left: 8px;">${status}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Leave Type:</span>
        <span class="credential-value">${sLeaveType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Dates:</span>
        <span class="credential-value">${startDate} to ${endDate}</span>
      </div>
    </div>

    ${!isApproved && sRejection ? `
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #991b1b; font-size: 14px;">💬 Reason for Rejection:</p>
      <p style="margin: 0; color: #b91c1c; font-size: 14px; line-height: 1.6;">${sRejection}</p>
    </div>
    ` : ''}

    <div class="divider"></div>

    <p class="email-text">
      Check your leave balances and request history in the HR portal.
    </p>
  `;

  return getEmailTemplate({
    title: `Leave Request ${status}: ${sLeaveType} - StreamlineOS`,
    preheader: `Your leave request has been ${status.toLowerCase()}`,
    content,
  });
}

export function getLeaveCancellationEmailTemplate(
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sLeaveType = escapeHtml(leaveType);
  const content = `
    <h2 class="email-title">🚫 Leave Request Cancelled</h2>
    <p class="email-text">
      <strong>${sEmployee}</strong> has cancelled their previously submitted leave request.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Employee:</span>
        <span class="credential-value">${sEmployee}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Leave Type:</span>
        <span class="credential-value">${sLeaveType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Duration:</span>
        <span class="credential-value">${startDate} to ${endDate}</span>
      </div>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      This leave request has been withdrawn and no longer requires your action.
    </p>
  `;

  return getEmailTemplate({
    title: `Leave Cancelled: ${sEmployee} - StreamlineOS`,
    preheader: `${sEmployee} cancelled their ${sLeaveType} request`,
    content,
  });
}
