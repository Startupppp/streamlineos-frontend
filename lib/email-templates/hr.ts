import { getEmailTemplate, baseUrl, logoUrl } from "./base";

export function getLeaveRequestEmailTemplate(
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string,
  leaveUrl: string
): string {
  const content = `
    <h2 class="email-title">📅 New Leave Request</h2>
    <p class="email-text">
      <strong>${employeeName}</strong> has submitted a new leave request that requires your approval.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Employee:</span>
        <span class="credential-value">${employeeName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Leave Type:</span>
        <span class="credential-value">${leaveType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Duration:</span>
        <span class="credential-value">${startDate} to ${endDate}</span>
      </div>
    </div>

    <div style="background: #f8fafc; border-left: 4px solid #0f2b7f; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">💬 Reason:</p>
      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${reason}</p>
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
    title: `Leave Request: ${employeeName} - Vaivamm Capital`,
    preheader: `${employeeName} requested ${leaveType} from ${startDate} to ${endDate}`,
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

  const content = `
    <h2 class="email-title">${isApproved ? "✅ Leave Request Approved" : "❌ Leave Request Rejected"}</h2>
    <p class="email-text">
      Your leave request for <strong>${leaveType}</strong> from <strong>${startDate} to ${endDate}</strong> has been <strong>${status.toLowerCase()}</strong> by ${approverName}.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Status:</span>
        <span style="color: ${statusColor}; font-weight: 700; margin-left: 8px;">${status}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Leave Type:</span>
        <span class="credential-value">${leaveType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Dates:</span>
        <span class="credential-value">${startDate} to ${endDate}</span>
      </div>
    </div>

    ${!isApproved && rejectionReason ? `
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #991b1b; font-size: 14px;">💬 Reason for Rejection:</p>
      <p style="margin: 0; color: #b91c1c; font-size: 14px; line-height: 1.6;">${rejectionReason}</p>
    </div>
    ` : ''}

    <div class="divider"></div>

    <p class="email-text">
      Check your leave balances and request history in the HR portal.
    </p>
  `;

  return getEmailTemplate({
    title: `Leave Request ${status}: ${leaveType} - Vaivamm Capital`,
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
  const content = `
    <h2 class="email-title">🚫 Leave Request Cancelled</h2>
    <p class="email-text">
      <strong>${employeeName}</strong> has cancelled their previously submitted leave request.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Employee:</span>
        <span class="credential-value">${employeeName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Leave Type:</span>
        <span class="credential-value">${leaveType}</span>
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
    title: `Leave Cancelled: ${employeeName} - Vaivamm Capital`,
    preheader: `${employeeName} cancelled their ${leaveType} request`,
    content,
  });
}

export function getDocumentExpiryReminderEmailTemplate(
  employeeName: string,
  documentName: string,
  documentType: string,
  expiryDate: string,
  daysRemaining: number
): string {
  const urgencyColor = daysRemaining <= 7 ? '#dc2626' : daysRemaining <= 14 ? '#f59e0b' : '#2563eb';
  const urgencyBg = daysRemaining <= 7 ? '#fee2e2' : daysRemaining <= 14 ? '#fef3c7' : '#dbeafe';

  const content = `
    <h2 class="email-title">📋 Document Expiry Reminder</h2>
    <p class="email-text">
      Hello <strong>${employeeName}</strong>,
    </p>

    <p class="email-text">
      This is a reminder that the following document is expiring soon:
    </p>

    <div class="credential-box" style="border-left-color: ${urgencyColor};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Document:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${documentName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Type:</td>
          <td style="padding: 8px 0; color: #475569;">${documentType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Expiry Date:</td>
          <td style="padding: 8px 0; color: ${urgencyColor}; font-weight: 700;">${expiryDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time Remaining:</td>
          <td style="padding: 8px 0;"><span style="background: ${urgencyBg}; color: ${urgencyColor}; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 13px;">${daysRemaining} days</span></td>
        </tr>
      </table>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: #64748b;">
      Please ensure to renew or update this document before it expires to avoid any compliance issues.
    </p>
  `;

  return getEmailTemplate({
    title: `Document Expiring Soon: ${documentName}`,
    preheader: `Your ${documentType} expires in ${daysRemaining} days`,
    content,
  });
}
