export const SUPPORT_QUEUES = ["HR", "IT", "FINANCE", "ADMIN", "LEGAL"] as const;

export type SupportQueue = (typeof SUPPORT_QUEUES)[number];

export const SUPPORT_QUEUE_LABELS: Record<SupportQueue, string> = {
  HR: "HR",
  IT: "IT",
  FINANCE: "Finance",
  ADMIN: "Admin",
  LEGAL: "Legal",
};

export const HELPDESK_CATEGORIES = [
  "policy_question",
  "payroll_issue",
  "document_request",
  "leave_issue",
  "benefits",
  "it_access",
  "equipment",
  "expense_reimbursement",
  "facilities",
  "legal_query",
  "confidential",
  "other",
] as const;

export type HelpdeskCategory = (typeof HELPDESK_CATEGORIES)[number];

export const HELPDESK_CATEGORY_LABELS: Record<HelpdeskCategory, string> = {
  policy_question: "Policy question",
  payroll_issue: "Payroll issue",
  document_request: "Document request",
  leave_issue: "Leave issue",
  benefits: "Benefits",
  it_access: "IT access",
  equipment: "Equipment",
  expense_reimbursement: "Expense reimbursement",
  facilities: "Facilities",
  legal_query: "Legal query",
  confidential: "Confidential",
  other: "Other",
};

export function helpdeskCategoryLabel(category: string | null): string {
  if (category === null) return "Other";
  const known = HELPDESK_CATEGORIES.find((candidate) => candidate === category);
  return known ? HELPDESK_CATEGORY_LABELS[known] : category;
}

export function isSupportQueue(value: string | null | undefined): value is SupportQueue {
  return SUPPORT_QUEUES.some((queue) => queue === value);
}
