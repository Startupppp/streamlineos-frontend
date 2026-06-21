
export const TERMINATION_REASONS = [
  "Performance Issues",
  "Attendance Issues",
  "Policy Violations",
  "Misconduct",
  "Behavioral Concerns",
  "Violation of Company Policies",
  "Unauthorized Absence",
  "Poor Productivity",
  "Project Non-Compliance",
  "Organizational Restructuring",
  "Position Redundancy",
  "End of Contract",
  "Security or Compliance Breach",
  "Other",
] as const;

export const TERMINATION_REASON_OTHER = "Other" as const;

export type TerminationReason = (typeof TERMINATION_REASONS)[number];


export const RESIGNATION_REASONS = [
  "Career growth opportunities",
  "Higher education or further studies",
  "Better salary or benefits",
  "Relocation (family/personal reasons)",
  "Work-life balance issues",
  "Change in career path",
  "Health reasons",
  "Personal commitments",
  "Job dissatisfaction",
  "Starting own business",
] as const;

export type ResignationReason = (typeof RESIGNATION_REASONS)[number];


export const TERMINATION_STATUSES = [
  "DRAFT",
  "PENDING_CEO",
  "APPROVED",
  "REJECTED",
  "SENT",
  "COMPLETED",
] as const;

export type TerminationStatusValue = (typeof TERMINATION_STATUSES)[number];

export const TERMINATION_STATUS_LABELS: Record<TerminationStatusValue, string> = {
  DRAFT: "Draft",
  PENDING_CEO: "Pending CEO",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SENT: "Email Sent",
  COMPLETED: "Completed",
};
