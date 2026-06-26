import { getEmailTemplate, appUrl, escapeHtml } from "../base";

export function getReviewAssignedEmailTemplate(
  employeeName: string,
  reviewerName: string,
  periodStart: string,
  periodEnd: string
): string {
  const content = `
    <h2 class="email-title">📝 Performance Review Assigned</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(employeeName)}</strong>, a performance review has been initiated for you.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Reviewer:</span>
        <span class="credential-value">${escapeHtml(reviewerName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Review Period:</span>
        <span class="credential-value">${escapeHtml(periodStart)} to ${escapeHtml(periodEnd)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${appUrl}/hr/performance" class="email-button">View Review</a>
    </div>
  `;
  return getEmailTemplate({ title: "Performance Review Assigned", content });
}

export function getAssetAssignedEmailTemplate(
  employeeName: string,
  assetName: string,
  assetType: string,
  serialNumber: string | null
): string {
  const content = `
    <h2 class="email-title">💻 Asset Assigned to You</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(employeeName)}</strong>, a company asset has been assigned to you.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Asset:</span>
        <span class="credential-value">${escapeHtml(assetName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Type:</span>
        <span class="credential-value">${escapeHtml(assetType)}</span>
      </div>
      ${serialNumber ? `
      <div class="credential-item">
        <span class="credential-label">Serial Number:</span>
        <span class="credential-value">${escapeHtml(serialNumber)}</span>
      </div>` : ""}
    </div>
    <p class="email-text">
      Please take care of this equipment. Report any issues to IT or HR.
    </p>
    <div style="text-align: center;">
      <a href="${appUrl}/hr/assets" class="email-button">View My Assets</a>
    </div>
  `;
  return getEmailTemplate({ title: "Asset Assigned", content });
}

export function getPayrollApprovedEmailTemplate(
  employeeName: string,
  month: string,
  approverName: string
): string {
  const content = `
    <h2 class="email-title">✅ Payroll Approved</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(employeeName)}</strong>, your payroll for <strong>${escapeHtml(month)}</strong> has been approved and is being processed.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Month:</span>
        <span class="credential-value">${escapeHtml(month)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Approved by:</span>
        <span class="credential-value">${escapeHtml(approverName)}</span>
      </div>
    </div>
    <p class="email-text">
      Your payslip will be available once payment is processed.
    </p>
    <div style="text-align: center;">
      <a href="${appUrl}/hr/my-payslips" class="email-button">View Payslips</a>
    </div>
  `;
  return getEmailTemplate({ title: "Payroll Approved", content });
}
