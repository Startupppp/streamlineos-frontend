import { getEmailTemplate, appUrl, escapeHtml } from "../base";

export function getOnboardingWelcomeEmailTemplate(
  employeeName: string,
  designation: string,
  joiningDate: string,
  taskCount: number
): string {
  const content = `
    <h2 class="email-title">🎉 Welcome to the Team!</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(employeeName)}</strong>, welcome aboard! We're excited to have you join us.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Role:</span>
        <span class="credential-value">${escapeHtml(designation)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Joining Date:</span>
        <span class="credential-value">${escapeHtml(joiningDate)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Onboarding Tasks:</span>
        <span class="credential-value">${taskCount} tasks to complete</span>
      </div>
    </div>
    <p class="email-text">
      Your onboarding tasks have been set up. Please log in to your dashboard to get started with your onboarding checklist.
    </p>
    <div style="text-align: center;">
      <a href="${appUrl}/hr/onboarding/my-tasks" class="email-button">Start Onboarding</a>
    </div>
    <div class="security-notice">
      <p class="security-text">
        💡 If this is your first time logging in, you'll be prompted to change your temporary password.
      </p>
    </div>
  `;
  return getEmailTemplate({ title: "Welcome to StreamlineOS", preheader: "Your onboarding journey starts now!", content });
}

export function getOnboardingTaskEmailTemplate(
  recipientName: string,
  employeeName: string,
  taskRole: string,
  taskCount: number
): string {
  const roleLabel = taskRole === "IT" ? "IT Setup" : taskRole === "HR" ? "HR" : "Manager";
  const content = `
    <h2 class="email-title">📋 Onboarding Tasks Assigned</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(recipientName)}</strong>, new onboarding tasks have been assigned to you.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">New Employee:</span>
        <span class="credential-value">${escapeHtml(employeeName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Your Role:</span>
        <span class="credential-value">${roleLabel}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Tasks Assigned:</span>
        <span class="credential-value">${taskCount}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${appUrl}/hr/onboarding" class="email-button">View Onboarding Tasks</a>
    </div>
  `;
  return getEmailTemplate({ title: "Onboarding Tasks Assigned", content });
}

export function getOnboardingCompleteEmployeeEmailTemplate(
  employeeName: string
): string {
  const content = `
    <h2 class="email-title">🎉 Onboarding Complete!</h2>
    <p class="email-text">
      Congratulations <strong>${escapeHtml(employeeName)}</strong>, you've completed all your onboarding tasks!
    </p>
    <p class="email-text">
      Your onboarding journey is now complete. You're all set to get started with your day-to-day work.
      If you have any questions, don't hesitate to reach out to your manager or HR.
    </p>
    <div style="text-align: center;">
      <a href="${appUrl}/hr/onboarding/my-tasks" class="email-button">View Dashboard</a>
    </div>
  `;
  return getEmailTemplate({ title: "Onboarding Complete", preheader: "You're all set!", content });
}

export function getOnboardingCompleteHrEmailTemplate(
  hrName: string,
  employeeName: string
): string {
  const content = `
    <h2 class="email-title">✅ Onboarding Complete</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(hrName)}</strong>, <strong>${escapeHtml(employeeName)}</strong> has completed all onboarding tasks.
    </p>
    <div style="text-align: center;">
      <a href="${appUrl}/hr/onboarding" class="email-button">View Onboarding</a>
    </div>
  `;
  return getEmailTemplate({ title: "Onboarding Complete", content });
}
