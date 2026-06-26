import { getEmailTemplate, appUrl, escapeHtml } from "../base";

export function getWorkLogApprovedEmailTemplate(
  employeeName: string,
  date: string,
  approverName: string
): string {
  const content = `
    <h2 class="email-title">✅ Work Log Approved</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(employeeName)}</strong>, your work log has been approved.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Date:</span>
        <span class="credential-value">${escapeHtml(date)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Approved by:</span>
        <span class="credential-value">${escapeHtml(approverName)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${appUrl}/hr/work-logs" class="email-button">View Work Logs</a>
    </div>
  `;
  return getEmailTemplate({ title: "Work Log Approved", content });
}

export function getWorkLogRejectedEmailTemplate(
  employeeName: string,
  date: string,
  approverName: string,
  reason?: string
): string {
  const content = `
    <h2 class="email-title">❌ Work Log Rejected</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(employeeName)}</strong>, your work log has been rejected.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Date:</span>
        <span class="credential-value">${escapeHtml(date)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Rejected by:</span>
        <span class="credential-value">${escapeHtml(approverName)}</span>
      </div>
      ${reason ? `
      <div class="credential-item">
        <span class="credential-label">Reason:</span>
        <span class="credential-value">${escapeHtml(reason)}</span>
      </div>` : ""}
    </div>
    <p class="email-text">Please review and resubmit your work log.</p>
    <div style="text-align: center;">
      <a href="${appUrl}/hr/work-logs" class="email-button">Update Work Log</a>
    </div>
  `;
  return getEmailTemplate({ title: "Work Log Rejected", content });
}
