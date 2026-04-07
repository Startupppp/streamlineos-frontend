import { getEmailTemplate, baseUrl, logoUrl, escapeHtml } from "./base";

export function getVerificationEmailTemplate(verificationUrl: string): string {
  const content = `
    <h2 class="email-title">Verify Your Email Address</h2>
    <p class="email-text">
      Thank you for signing up! To complete your registration and access all features,
      please verify your email address by clicking the button below.
    </p>

    <div style="text-align: center;">
      <a href="${verificationUrl}" class="email-button">
        Verify Email Address
      </a>
    </div>

    <p class="email-text" style="font-size: 14px; color: #64748b; margin-top: 24px;">
      If the button doesn't work, you can copy and paste this link into your browser:
    </p>
    <p class="email-text" style="word-break: break-all; font-size: 13px; color: #0f2b7f;">
      ${verificationUrl}
    </p>

    <div class="security-notice">
      <p class="security-text">
        <strong>Security Notice:</strong> This link will expire in 24 hours.
        If you didn't create an account, please ignore this email.
      </p>
    </div>
  `;

  return getEmailTemplate({
    title: 'Verify Your Email - Vaivamm Capital',
    preheader: 'Complete your registration by verifying your email address',
    content,
  });
}

export function getPasswordResetEmailTemplate(resetUrl: string): string {
  const content = `
    <h2 class="email-title">Reset Your Password</h2>
    <p class="email-text">
      We received a request to reset your password. Click the button below to create a new password.
    </p>

    <div style="text-align: center;">
      <a href="${resetUrl}" class="email-button">
        Reset Password
      </a>
    </div>

    <p class="email-text" style="font-size: 14px; color: #64748b; margin-top: 24px;">
      If the button doesn't work, you can copy and paste this link into your browser:
    </p>
    <p class="email-text" style="word-break: break-all; font-size: 13px; color: #0f2b7f;">
      ${resetUrl}
    </p>

    <div class="divider"></div>

    <div class="security-notice">
      <p class="security-text">
        <strong>Security Notice:</strong> This link will expire in 1 hour.
        If you didn't request a password reset, please ignore this email or contact support if you have concerns.
      </p>
    </div>
  `;

  return getEmailTemplate({
    title: 'Reset Your Password - Vaivamm Capital',
    preheader: 'Click to reset your password securely',
    content,
  });
}

export function getWelcomeEmailTemplate(name: string, email: string, tempPassword: string, loginUrl: string): string {
  const sName = escapeHtml(name);
  const sEmail = escapeHtml(email);
  const content = `
    <h2 class="email-title">Welcome to Vaivamm Capital, ${sName}! 🚀</h2>
    <p class="email-text">
      Your account has been successfully created. We're excited to have you on board!
    </p>

    <p class="email-text">
      Here are your login credentials:
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Email:</span>
        <span class="credential-value">${sEmail}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Temporary Password:</span>
        <span class="credential-value">${tempPassword}</span>
      </div>
    </div>

    <div class="security-notice">
      <p class="security-text">
        <strong>Important:</strong> Please change your password immediately after your first login for security purposes.
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${loginUrl}" class="email-button">
        Login Now
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      <strong>Getting Started:</strong>
    </p>
    <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 16px 0;">
      <li>Complete your profile with a photo and personal details</li>
      <li>Explore the dashboard to see your team and projects</li>
      <li>Set up your attendance tracking</li>
      <li>Check out your leave balances</li>
    </ul>
  `;

  return getEmailTemplate({
    title: 'Welcome to Vaivamm Capital - Your Account Details',
    preheader: 'Your account is ready. Let\'s get started!',
    content,
  });
}

export function getPasswordChangeConfirmationEmailTemplate(userName: string): string {
  const sUserName = escapeHtml(userName);
  const content = `
    <h2 class="email-title">🔒 Password Changed Successfully</h2>
    <p class="email-text">
      Hi <strong>${sUserName}</strong>,
    </p>

    <p class="email-text">
      Your password has been successfully changed. If you made this change, you can safely ignore this email.
    </p>

    <div class="security-notice">
      <p class="security-text">
        <strong>Security Alert:</strong> If you did NOT make this change, please contact our support team immediately
        at <a href="mailto:support@vaivammcapital.com" style="color: #92400e; text-decoration: underline;">support@vaivammcapital.com</a>
        or reset your password right away.
      </p>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px;">
      <strong>Security Tips:</strong>
    </p>
    <ul style="color: #475569; font-size: 14px; line-height: 1.8; margin: 16px 0;">
      <li>Use a strong, unique password for your account</li>
      <li>Never share your password with anyone</li>
      <li>Enable two-factor authentication if available</li>
      <li>Update your password regularly</li>
    </ul>
  `;

  return getEmailTemplate({
    title: 'Password Changed Successfully - Vaivamm Capital',
    preheader: 'Your password has been updated',
    content,
  });
}

export function getAccountDeactivationEmailTemplate(
  employeeName: string,
  deactivatedBy: string,
  reason?: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sDeactivatedBy = escapeHtml(deactivatedBy);
  const sReason = reason ? escapeHtml(reason) : undefined;
  const content = `
    <h2 class="email-title">👋 Account Deactivated</h2>
    <p class="email-text">
      Dear <strong>${sEmployee}</strong>,
    </p>

    <p class="email-text">
      Your account on Vaivamm Capital CRM has been deactivated by <strong>${sDeactivatedBy}</strong>.
    </p>

    ${sReason ? `
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Reason:</span>
        <span style="color: #475569; margin-left: 8px;">${sReason}</span>
      </div>
    </div>
    ` : ''}

    <p class="email-text">
      You will no longer have access to:
    </p>
    <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 16px 0;">
      <li>The CRM dashboard and all projects</li>
      <li>Time tracking and attendance systems</li>
      <li>HR portal and leave management</li>
      <li>Company documents and files</li>
    </ul>

    <div class="divider"></div>

    <p class="email-text">
      If you believe this is an error or have questions, please contact HR at
      <a href="mailto:support@vaivammcapital.com" style="color: #0f2b7f; text-decoration: underline;">support@vaivammcapital.com</a>.
    </p>

    <p class="email-text" style="margin-top: 24px;">
      Thank you for your contributions to the organization.
    </p>
  `;

  return getEmailTemplate({
    title: 'Account Deactivated - Vaivamm Capital',
    preheader: 'Your account has been deactivated',
    content,
  });
}
