import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getWelcomeEmailTemplate,
  getPasswordChangeConfirmationEmailTemplate,
  getAccountDeactivationEmailTemplate,
  getAccountLockedEmailTemplate,
  getNewDeviceLoginEmailTemplate,
  getPasswordExpiryWarningEmailTemplate,
} from "@/lib/email-templates/auth";

import {
  getLeaveRequestEmailTemplate,
  getLeaveStatusUpdateEmailTemplate,
  getLeaveCancellationEmailTemplate,
  getDocumentExpiryReminderEmailTemplate,
  getResignationSubmittedEmailTemplate,
  getResignationApprovedEmailTemplate,
} from "@/lib/email-templates/hr";

import {
  getInvitationEmailTemplate,
  getHolidayAnnouncementEmailTemplate,
  getCompanyAnnouncementEmailTemplate,
} from "@/lib/email-templates/organization";

import { EXTRA_TEMPLATES } from "./template-registry-extra";

export interface EmailTemplateConfig {
  id: string;
  category: string;
  name: string;
  generate: () => { subject: string; html: string };
}

const BASE_URL = "https://streamlineos.app";

const CORE_TEMPLATES: EmailTemplateConfig[] = [
  {
    id: "auth.verify",
    category: "Auth",
    name: "Email Verification",
    generate: () => ({
      subject: "Verify Your Email Address - StreamlineOS",
      html: getVerificationEmailTemplate(`${BASE_URL}/verify-email?token=abc123`),
    }),
  },
  {
    id: "auth.password_reset",
    category: "Auth",
    name: "Password Reset",
    generate: () => ({
      subject: "Reset Your Password - StreamlineOS",
      html: getPasswordResetEmailTemplate(`${BASE_URL}/auth/reset-password?token=abc123`),
    }),
  },
  {
    id: "auth.welcome",
    category: "Auth",
    name: "Welcome / Account Created",
    generate: () => ({
      subject: "Welcome to StreamlineOS — Set Up Your Account",
      html: getWelcomeEmailTemplate(
        "Priya Sharma",
        "priya@example.com",
        `${BASE_URL}/setup-password?token=sample-token`
      ),
    }),
  },
  {
    id: "auth.password_changed",
    category: "Auth",
    name: "Password Changed Confirmation",
    generate: () => ({
      subject: "Password Changed Successfully - StreamlineOS",
      html: getPasswordChangeConfirmationEmailTemplate("Priya Sharma"),
    }),
  },
  {
    id: "auth.account_deactivated",
    category: "Auth",
    name: "Account Deactivated",
    generate: () => ({
      subject: "Account Deactivated - StreamlineOS",
      html: getAccountDeactivationEmailTemplate(
        "Rohan Mehta",
        "Anita HR",
        "Resigned from company"
      ),
    }),
  },
  {
    id: "auth.account_locked",
    category: "Auth",
    name: "Account Locked",
    generate: () => ({
      subject: "Account Locked - StreamlineOS",
      html: getAccountLockedEmailTemplate("Rohan Mehta"),
    }),
  },
  {
    id: "auth.new_device",
    category: "Auth",
    name: "New Device Login Alert",
    generate: () => ({
      subject: "New Device Sign-In Detected - StreamlineOS",
      html: getNewDeviceLoginEmailTemplate("Priya Sharma", {
        userAgent: "Chrome 123 on Windows 11",
        ipAddress: "103.45.67.89",
        time: new Date().toLocaleString("en-IN"),
      }),
    }),
  },
  {
    id: "auth.password_expiry",
    category: "Auth",
    name: "Password Expiry Warning",
    generate: () => ({
      subject: "Your Password Expires in 7 Days - StreamlineOS",
      html: getPasswordExpiryWarningEmailTemplate("Priya Sharma", 7),
    }),
  },
  {
    id: "org.invitation",
    category: "Organization",
    name: "Team Invitation",
    generate: () => ({
      subject: "Invitation to join StreamlineOS",
      html: getInvitationEmailTemplate(
        `${BASE_URL}/invitation/tok123`,
        "StreamlineOS",
        "Anita HR"
      ),
    }),
  },
  {
    id: "org.holiday",
    category: "Organization",
    name: "Holiday Announcement",
    generate: () => ({
      subject: "Holiday Tomorrow: Diwali - StreamlineOS",
      html: getHolidayAnnouncementEmailTemplate(
        "Diwali",
        "2 Nov 2026",
        "Wishing everyone a joyful and bright Diwali! Office will remain closed."
      ),
    }),
  },
  {
    id: "org.announcement",
    category: "Organization",
    name: "Company Announcement",
    generate: () => ({
      subject: "Announcement: Q3 All-Hands Meeting - StreamlineOS",
      html: getCompanyAnnouncementEmailTemplate(
        "Q3 All-Hands Meeting",
        "We are holding our Q3 All-Hands meeting on Friday at 4 PM IST. Please make sure to attend.",
        "Rahul StreamlineOS"
      ),
    }),
  },
  {
    id: "hr.leave_request",
    category: "HR Leave",
    name: "Leave Request (to approver)",
    generate: () => ({
      subject: "Leave Request: Rohan Mehta - StreamlineOS",
      html: getLeaveRequestEmailTemplate(
        "Anita HR",
        "Rohan Mehta",
        "Casual Leave",
        "20 Apr 2026",
        "22 Apr 2026",
        "Personal work — family function.",
        `${BASE_URL}/hr/leaves`
      ),
    }),
  },
  {
    id: "hr.leave_approved",
    category: "HR Leave",
    name: "Leave Approved",
    generate: () => ({
      subject: "Leave Request APPROVED: Casual Leave - StreamlineOS",
      html: getLeaveStatusUpdateEmailTemplate(
        "Rohan Mehta",
        "Casual Leave",
        "20 Apr 2026",
        "22 Apr 2026",
        "APPROVED",
        "Anita HR"
      ),
    }),
  },
  {
    id: "hr.leave_rejected",
    category: "HR Leave",
    name: "Leave Rejected",
    generate: () => ({
      subject: "Leave Request REJECTED: Casual Leave - StreamlineOS",
      html: getLeaveStatusUpdateEmailTemplate(
        "Rohan Mehta",
        "Casual Leave",
        "20 Apr 2026",
        "22 Apr 2026",
        "REJECTED",
        "Anita HR",
        "Insufficient leave balance for this period."
      ),
    }),
  },
  {
    id: "hr.leave_cancelled",
    category: "HR Leave",
    name: "Leave Cancellation",
    generate: () => ({
      subject: "Leave Cancelled: Rohan Mehta - StreamlineOS",
      html: getLeaveCancellationEmailTemplate(
        "Anita HR",
        "Rohan Mehta",
        "Casual Leave",
        "20 Apr 2026",
        "22 Apr 2026"
      ),
    }),
  },
  {
    id: "hr.doc_expiry",
    category: "HR Leave",
    name: "Document Expiry Reminder",
    generate: () => ({
      subject: "Document Expiring Soon: Aadhaar Card",
      html: getDocumentExpiryReminderEmailTemplate(
        "Rohan Mehta",
        "Aadhaar Card",
        "Identity Document",
        "30 Apr 2026",
        12
      ),
    }),
  },
  {
    id: "hr.resignation_submitted",
    category: "HR Leave",
    name: "Resignation Submitted",
    generate: () => ({
      subject: "Resignation Submitted: Rohan Mehta - StreamlineOS",
      html: getResignationSubmittedEmailTemplate(
        "Anita HR",
        "Rohan Mehta",
        "Senior Associate",
        "12 Apr 2026",
        "12 May 2026",
        30,
        "Pursuing higher education abroad.",
        `${BASE_URL}/hr/exit`
      ),
    }),
  },
  {
    id: "hr.resignation_approved",
    category: "HR Leave",
    name: "Resignation Accepted",
    generate: () => ({
      subject: "Resignation Accepted - StreamlineOS",
      html: getResignationApprovedEmailTemplate(
        "Rohan Mehta",
        "Rahul StreamlineOS",
        "12 May 2026",
        30,
        "12 Apr 2026",
        `${BASE_URL}/hr/exit`
      ),
    }),
  },
];

export const TEMPLATE_REGISTRY: EmailTemplateConfig[] = [...CORE_TEMPLATES, ...EXTRA_TEMPLATES];

export const CATEGORIES = Array.from(new Set(TEMPLATE_REGISTRY.map((t) => t.category)));
