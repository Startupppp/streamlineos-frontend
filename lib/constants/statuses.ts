
export const CANDIDATE_STATUSES = {
  NEW: "NEW",
  SCREENING: "SCREENING",
  INTERVIEW: "INTERVIEW",
  OFFER: "OFFER",
  HIRED: "HIRED",
  REJECTED: "REJECTED",
} as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[keyof typeof CANDIDATE_STATUSES];

export const APPLICATION_STATUSES = {
  APPLIED: "APPLIED",
  SHORTLISTED: "SHORTLISTED",
  INTERVIEWING: "INTERVIEWING",
  OFFERED: "OFFERED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
} as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[keyof typeof APPLICATION_STATUSES];

export const INVOICE_STATUSES = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[keyof typeof INVOICE_STATUSES];

export const SUPPORT_TICKET_STATUSES = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING: "WAITING",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[keyof typeof SUPPORT_TICKET_STATUSES];

export const CRM_SUPPORT_TICKET_STATUSES = {
  NEW: "new",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export type CrmSupportTicketStatus = (typeof CRM_SUPPORT_TICKET_STATUSES)[keyof typeof CRM_SUPPORT_TICKET_STATUSES];

export const LEAVE_STATUSES = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

export type LeaveStatus = (typeof LEAVE_STATUSES)[keyof typeof LEAVE_STATUSES];

export const EXPENSE_STATUSES = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PAID: "PAID",
} as const;

export type ExpenseStatus = (typeof EXPENSE_STATUSES)[keyof typeof EXPENSE_STATUSES];

export const PAYROLL_STATUSES = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  PAID: "PAID",
} as const;

export type PayrollStatus = (typeof PAYROLL_STATUSES)[keyof typeof PAYROLL_STATUSES];

export const REVIEW_CYCLE_STATUSES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type ReviewCycleStatus = (typeof REVIEW_CYCLE_STATUSES)[keyof typeof REVIEW_CYCLE_STATUSES];

export const QUOTE_STATUSES = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[keyof typeof QUOTE_STATUSES];

export const SURVEY_STATUSES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
} as const;

export type SurveyStatus = (typeof SURVEY_STATUSES)[keyof typeof SURVEY_STATUSES];

export const MEETING_STATUSES = {
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
} as const;

export type MeetingStatus = (typeof MEETING_STATUSES)[keyof typeof MEETING_STATUSES];

export const ONBOARDING_DOC_STATUSES = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  RE_UPLOAD_REQUESTED: "RE_UPLOAD_REQUESTED",
} as const;

export type OnboardingDocStatus = (typeof ONBOARDING_DOC_STATUSES)[keyof typeof ONBOARDING_DOC_STATUSES];
