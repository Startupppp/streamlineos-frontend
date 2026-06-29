import { getEmailTemplate, escapeHtml } from "../base";

export function getResignationSubmittedEmailTemplate(
  hrName: string,
  employeeName: string,
  employeeDesignation: string,
  submissionDate: string,
  lastWorkingDate: string,
  noticePeriodDays: number,
  reason: string,
  reviewUrl: string
): string {
  const sHr = escapeHtml(hrName);
  const sEmployee = escapeHtml(employeeName);
  const sDesignation = escapeHtml(employeeDesignation);
  const sReason = escapeHtml(reason);

  const content = `
    <h2 class="email-title">📝 Resignation Submitted</h2>
    <p class="email-text">
      Dear <strong>${sHr}</strong>,
    </p>
    <p class="email-text">
      <strong>${sEmployee}</strong> has submitted a resignation letter that requires your review and action.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Employee:</span>
        <span class="credential-value">${sEmployee}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Designation:</span>
        <span class="credential-value">${sDesignation}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Submission Date:</span>
        <span class="credential-value">${submissionDate}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Notice Period:</span>
        <span class="credential-value">${noticePeriodDays} days</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Last Working Date:</span>
        <span class="credential-value" style="color: #dc2626; font-weight: 700;">${lastWorkingDate}</span>
      </div>
    </div>

    <div style="background: #f8fafc; border-left: 4px solid #0f2b7f; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">Reason for Resignation:</p>
      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.7;">${sReason}</p>
    </div>

    <div style="text-align: center;">
      <a href="${reviewUrl}" class="email-button">
        Review Resignation
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px;">
      Please review and take the appropriate action (approve or reject) through the HR portal.
      The employee will be notified of your decision.
    </p>
  `;

  return getEmailTemplate({
    title: `Resignation Submitted: ${sEmployee} - StreamlineOS`,
    preheader: `${sEmployee} has submitted a resignation. Last working date: ${lastWorkingDate}`,
    content,
  });
}

export function getResignationApprovedEmailTemplate(
  employeeName: string,
  approverName: string,
  lastWorkingDate: string,
  noticePeriodDays: number,
  submissionDate: string,
  portalUrl: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sApprover = escapeHtml(approverName);

  const content = `
    <h2 class="email-title">✅ Resignation Accepted</h2>
    <p class="email-text">
      Dear <strong>${sEmployee}</strong>,
    </p>
    <p class="email-text">
      We have received and accepted your resignation. This letter confirms the acceptance of your
      resignation submitted on <strong>${submissionDate}</strong>.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Approved By:</span>
        <span class="credential-value">${sApprover}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Notice Period:</span>
        <span class="credential-value">${noticePeriodDays} days</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Last Working Date:</span>
        <span class="credential-value" style="color: #0f2b7f; font-weight: 700;">${lastWorkingDate}</span>
      </div>
    </div>

    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #15803d; font-size: 14px;">Next Steps</p>
      <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 14px; line-height: 1.8;">
        <li>Complete all pending work and handover responsibilities before your last working day</li>
        <li>An exit interview will be scheduled before your last working date</li>
        <li>Return all company assets, access cards, and equipment on or before ${lastWorkingDate}</li>
        <li>Full &amp; Final settlement will be processed after your last working day</li>
        <li>Experience letter will be issued upon completion of exit formalities</li>
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="${portalUrl}" class="email-button">
        View Exit Details
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px;">
      We appreciate your contributions to StreamlineOS and wish you all the best in your future endeavours.
      If you have any questions regarding the exit process, please contact the HR department.
    </p>
  `;

  return getEmailTemplate({
    title: `Resignation Accepted - StreamlineOS`,
    preheader: `Your resignation has been accepted. Last working date: ${lastWorkingDate}`,
    content,
  });
}

