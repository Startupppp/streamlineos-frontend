import {
  getExpenseSubmittedEmailTemplate,
  getExpenseApprovedEmailTemplate,
  getExpenseRejectedEmailTemplate,
  getExpensePaidEmailTemplate,
} from "@/lib/email-templates/expense";

import {
  getSelfReviewReminderEmail,
  getManagerReviewReminderEmail,
  getReviewPublishedEmail,
  getGoalSettingReminderEmail,
} from "@/lib/email-templates/appraisal";

import {
  getLeadWelcomeEmail,
  getFollowUpReminderEmail,
  getDealWonEmail,
  getSlaBreachAlertEmail,
  getClientOnboardingEmail,
} from "@/lib/email-templates/crm";

import {
  getProjectAssignmentEmailTemplate,
  getTicketAssignmentEmailTemplate,
  getTicketReviewRequestEmailTemplate,
  getTicketChangesRequestedEmailTemplate,
} from "@/lib/email-templates/project";

import type { EmailTemplateConfig } from "./template-registry";

const BASE_URL = "https://streamlineos.app";

export const EXTRA_TEMPLATES: EmailTemplateConfig[] = [
  {
    id: "expense.submitted",
    category: "HR Expense",
    name: "Expense Submitted",
    generate: () => ({
      subject: "New Expense Claim from Priya Sharma",
      html: getExpenseSubmittedEmailTemplate(
        "Anita HR",
        "Priya Sharma",
        "Travel",
        "4,500",
        "Cab to client site — Mumbai Airport to BKC",
        `${BASE_URL}/hr/expenses`
      ),
    }),
  },
  {
    id: "expense.approved",
    category: "HR Expense",
    name: "Expense Approved",
    generate: () => ({
      subject: "Expense Claim Approved - ₹4,500",
      html: getExpenseApprovedEmailTemplate("Priya Sharma", "Travel", "4,500", "Anita HR"),
    }),
  },
  {
    id: "expense.rejected",
    category: "HR Expense",
    name: "Expense Rejected",
    generate: () => ({
      subject: "Expense Claim Rejected - ₹4,500",
      html: getExpenseRejectedEmailTemplate(
        "Priya Sharma",
        "Travel",
        "4,500",
        "Anita HR",
        "Receipt not attached. Please resubmit with a valid receipt."
      ),
    }),
  },
  {
    id: "expense.paid",
    category: "HR Expense",
    name: "Expense Reimbursed",
    generate: () => ({
      subject: "Expense Reimbursed - ₹4,500",
      html: getExpensePaidEmailTemplate("Priya Sharma", "Travel", "4,500", "TXN-2026-04-45821"),
    }),
  },
  {
    id: "appraisal.self_review",
    category: "Appraisal",
    name: "Self-Review Reminder",
    generate: () => ({
      subject: "Self-Review Due: Q1 FY2026 Performance Review",
      html: getSelfReviewReminderEmail(
        "Priya Sharma",
        "Q1 FY2026 Performance Review",
        "30 Apr 2026",
        `${BASE_URL}/hr/appraisals/review`
      ),
    }),
  },
  {
    id: "appraisal.manager_review",
    category: "Appraisal",
    name: "Manager Review Reminder",
    generate: () => ({
      subject: "3 Pending Reviews — Q1 FY2026 Performance Review",
      html: getManagerReviewReminderEmail(
        "Anita HR",
        3,
        "Q1 FY2026 Performance Review",
        `${BASE_URL}/hr/appraisals`
      ),
    }),
  },
  {
    id: "appraisal.published",
    category: "Appraisal",
    name: "Review Published",
    generate: () => ({
      subject: "Your Q1 FY2026 Review is Published",
      html: getReviewPublishedEmail(
        "Priya Sharma",
        "Q1 FY2026 Performance Review",
        "4.2 / 5 — Exceeds Expectations",
        `${BASE_URL}/hr/appraisals/result`
      ),
    }),
  },
  {
    id: "appraisal.goal_setting",
    category: "Appraisal",
    name: "Goal Setting Reminder",
    generate: () => ({
      subject: "Set Your Q2 FY2026 Goals",
      html: getGoalSettingReminderEmail(
        "Priya Sharma",
        "Q2 FY2026",
        "15 May 2026",
        `${BASE_URL}/hr/appraisals/goals`
      ),
    }),
  },
  {
    id: "crm.lead_welcome",
    category: "CRM",
    name: "Lead Welcome Email",
    generate: () => ({
      subject: "Thank you for contacting StreamlineOS",
      html: getLeadWelcomeEmail("Vikram Nair", "StreamlineOS", "info@streamlineos.app", BASE_URL),
    }),
  },
  {
    id: "crm.follow_up",
    category: "CRM",
    name: "Follow-Up Reminder (internal)",
    generate: () => ({
      subject: "Follow up with Vikram Nair",
      html: getFollowUpReminderEmail(
        "Priya Sharma",
        "Vikram Nair",
        7,
        `${BASE_URL}/crm/leads/42`
      ),
    }),
  },
  {
    id: "crm.deal_won",
    category: "CRM",
    name: "Deal Won (team notification)",
    generate: () => ({
      subject: "Deal Won: Nair Enterprises SIP — ₹25,00,000",
      html: getDealWonEmail(
        "Team",
        "Nair Enterprises SIP",
        "₹25,00,000",
        "Priya Sharma",
        `${BASE_URL}/crm/deals`
      ),
    }),
  },
  {
    id: "crm.sla_breach",
    category: "CRM",
    name: "SLA Breach Alert",
    generate: () => ({
      subject: "SLA Breach: Vikram Nair",
      html: getSlaBreachAlertEmail(
        "Priya Sharma",
        "Vikram Nair",
        6,
        `${BASE_URL}/crm/leads/42`
      ),
    }),
  },
  {
    id: "crm.client_onboarding",
    category: "CRM",
    name: "Client Onboarding Email",
    generate: () => ({
      subject: "Welcome to StreamlineOS",
      html: getClientOnboardingEmail(
        "Nair Enterprises",
        "StreamlineOS",
        "Priya Sharma",
        `${BASE_URL}/client-portal`
      ),
    }),
  },
  {
    id: "project.assigned",
    category: "Projects",
    name: "Project Assignment",
    generate: () => ({
      subject: "Added to Project: Platform Revamp - StreamlineOS",
      html: getProjectAssignmentEmailTemplate(
        "Rohan Mehta",
        "Platform Revamp",
        "PLT-001",
        `${BASE_URL}/projects/5`,
        "Anita HR"
      ),
    }),
  },
  {
    id: "project.ticket_assigned",
    category: "Projects",
    name: "Ticket Assigned",
    generate: () => ({
      subject: "Ticket Assigned: Fix dashboard layout - StreamlineOS",
      html: getTicketAssignmentEmailTemplate(
        "Rohan Mehta",
        "Fix dashboard layout on mobile",
        "BUG",
        "HIGH",
        "Platform Revamp",
        `${BASE_URL}/projects/5?ticket=101`,
        "Priya Sharma"
      ),
    }),
  },
  {
    id: "project.review_request",
    category: "Projects",
    name: "Ticket Review Request",
    generate: () => ({
      subject: "Review Requested: Fix dashboard layout - StreamlineOS",
      html: getTicketReviewRequestEmailTemplate(
        "Anita HR",
        "Fix dashboard layout on mobile",
        "BUG",
        "Platform Revamp",
        `${BASE_URL}/projects/5?ticket=101`,
        "Rohan Mehta",
        "Tested on iOS and Android — looks good now."
      ),
    }),
  },
  {
    id: "project.changes_requested",
    category: "Projects",
    name: "Changes Requested",
    generate: () => ({
      subject: "Changes Requested: Fix dashboard layout - StreamlineOS",
      html: getTicketChangesRequestedEmailTemplate(
        "Rohan Mehta",
        "Fix dashboard layout on mobile",
        "Platform Revamp",
        `${BASE_URL}/projects/5?ticket=101`,
        "Anita HR",
        "Tablet breakpoint (768px) still broken. Please fix and re-test."
      ),
    }),
  },
];
