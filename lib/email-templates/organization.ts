import { getEmailTemplate, baseUrl, logoUrl } from "./base";

export function getInvitationEmailTemplate(invitationUrl: string, organizationName: string, inviterName?: string): string {
  const content = `
    <h2 class="email-title">🎉 You're Invited!</h2>
    <p class="email-text">
      ${inviterName ? `<strong>${inviterName}</strong> has invited you` : 'You have been invited'}
      to join <strong>${organizationName}</strong> on Vaivamm Capital CRM.
    </p>

    <p class="email-text">
      Join your team to collaborate on projects, track attendance, manage HR operations, and more.
    </p>

    <div style="text-align: center;">
      <a href="${invitationUrl}" class="email-button">
        Accept Invitation
      </a>
    </div>

    <p class="email-text" style="font-size: 14px; color: #64748b; margin-top: 24px;">
      If the button doesn't work, you can copy and paste this link into your browser:
    </p>
    <p class="email-text" style="word-break: break-all; font-size: 13px; color: #0f2b7f;">
      ${invitationUrl}
    </p>

    <div class="divider"></div>

    <div class="security-notice">
      <p class="security-text">
        <strong>Note:</strong> This invitation will expire in 7 days.
        If you don't recognize this organization, you can safely ignore this email.
      </p>
    </div>
  `;

  return getEmailTemplate({
    title: `Invitation to join ${organizationName} - Vaivamm Capital`,
    preheader: `You've been invited to join ${organizationName}`,
    content,
  });
}

export function getHolidayAnnouncementEmailTemplate(
  holidayName: string,
  holidayDate: string,
  message?: string
): string {
  const content = `
    <h2 class="email-title">🎉 Upcoming Holiday: ${holidayName}</h2>
    <p class="email-text">
      Dear Team,
    </p>

    <p class="email-text">
      This is a friendly reminder that <strong>${holidayName}</strong> is tomorrow, <strong>${holidayDate}</strong>.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Holiday:</span>
        <span class="credential-value">${holidayName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Date:</span>
        <span class="credential-value">${holidayDate}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Status:</span>
        <span style="color: #22c55e; font-weight: 700; margin-left: 8px;">OFFICE CLOSED</span>
      </div>
    </div>

    ${message ? `
    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #166534; font-size: 14px;">💬 Message:</p>
      <p style="margin: 0; color: #15803d; font-size: 14px; line-height: 1.6;">${message}</p>
    </div>
    ` : ''}

    <p class="email-text">
      Please ensure all urgent tasks are completed before the end of today. The office will resume normal operations the following working day.
    </p>

    <div class="divider"></div>

    <p class="email-text">
      Wishing you and your family a wonderful ${holidayName}! 🎊
    </p>
  `;

  return getEmailTemplate({
    title: `Holiday Tomorrow: ${holidayName} - Vaivamm Capital`,
    preheader: `Office closed tomorrow for ${holidayName}`,
    content,
  });
}

export function getCompanyAnnouncementEmailTemplate(
  subject: string,
  message: string,
  announcedBy: string
): string {
  const content = `
    <h2 class="email-title">📢 Company Announcement</h2>
    <p class="email-text">
      Dear Team,
    </p>

    <p class="email-text">
      <strong>${announcedBy}</strong> has shared an important announcement:
    </p>

    <div class="credential-box">
      <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px;">${subject}</h3>
      <div style="color: #475569; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${message}</div>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: #64748b;">
      For any questions or clarifications, please reach out to your manager or HR.
    </p>
  `;

  return getEmailTemplate({
    title: `Announcement: ${subject} - Vaivamm Capital`,
    preheader: subject,
    content,
  });
}
