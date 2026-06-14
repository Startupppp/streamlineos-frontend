import { getEmailTemplate, escapeHtml } from "../base";

export function getDocumentExpiryReminderEmailTemplate(
  employeeName: string,
  documentName: string,
  documentType: string,
  expiryDate: string,
  daysRemaining: number
): string {
  const urgencyColor = daysRemaining <= 7 ? '#dc2626' : daysRemaining <= 14 ? '#f59e0b' : '#2563eb';
  const urgencyBg = daysRemaining <= 7 ? '#fee2e2' : daysRemaining <= 14 ? '#fef3c7' : '#dbeafe';
  const sEmployee = escapeHtml(employeeName);
  const sDocName = escapeHtml(documentName);
  const sDocType = escapeHtml(documentType);

  const content = `
    <h2 class="email-title">📋 Document Expiry Reminder</h2>
    <p class="email-text">
      Hello <strong>${sEmployee}</strong>,
    </p>

    <p class="email-text">
      This is a reminder that the following document is expiring soon:
    </p>

    <div class="credential-box" style="border-left-color: ${urgencyColor};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Document:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${sDocName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Type:</td>
          <td style="padding: 8px 0; color: #475569;">${sDocType}</td>
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
    title: `Document Expiring Soon: ${sDocName}`,
    preheader: `Your ${sDocType} expires in ${daysRemaining} days`,
    content,
  });
}
