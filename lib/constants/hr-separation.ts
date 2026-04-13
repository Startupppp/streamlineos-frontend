// ─── Termination Reasons (employer-initiated) ────────────────────────────────

export const TERMINATION_REASONS = [
  "Poor performance",
  "Misconduct / violation of company policies",
  "Attendance issues / absenteeism",
  "Behavioral issues",
  "Company restructuring / layoffs",
  "Redundancy of role",
  "Project closure",
  "Failure to meet targets",
  "Breach of confidentiality",
  "Insubordination",
] as const;

export type TerminationReason = (typeof TERMINATION_REASONS)[number];

// ─── Resignation Reasons (employee-initiated) ────────────────────────────────

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

// ─── Termination Status ──────────────────────────────────────────────────────

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
