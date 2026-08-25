import type { EmployeeData } from "@/features/hr/employees/detail/edit-employee-form";

export const LIFECYCLE_BADGE: Record<string, { label: string; className: string }> = {
  CANDIDATE: {
    label: "Candidate",
    className:
      "bg-muted text-foreground border-border",
  },
  PRE_JOINING: {
    label: "Pre-joining",
    className:
      "bg-status-info-surface text-status-info-ink border-status-info-rule",
  },
  ONBOARDING: {
    label: "Onboarding",
    className:
      "bg-category-violet-surface text-category-violet-ink border-category-violet-rule",
  },
  ACTIVE: {
    label: "Active",
    className:
      "bg-status-success-surface text-status-success-ink border-status-success-rule",
  },
  PROBATION: {
    label: "Probation",
    className:
      "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  },
  CONFIRMED: {
    label: "Confirmed",
    className:
      "bg-status-success-surface text-status-success-ink border-status-success-rule",
  },
  NOTICE: {
    label: "Notice",
    className:
      "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  },
  EXITED: {
    label: "Exited",
    className:
      "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  },
  ALUMNI: {
    label: "Alumni",
    className: "bg-muted text-muted-foreground border-border",
  },
  SUSPENDED: {
    label: "Suspended",
    className:
      "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  },
};

export function profileCompletenessScore(employee: EmployeeData): {
  pct: number;
  missing: string[];
} {
  const fields: Array<{ label: string; filled: boolean }> = [
    { label: "First name", filled: !!employee.firstName },
    { label: "Last name", filled: !!employee.lastName },
    { label: "Phone", filled: !!employee.phone },
    { label: "Designation", filled: !!employee.designation },
    { label: "Profile photo", filled: !!employee.image },
    { label: "Bio", filled: !!employee.bio },
    { label: "Skills", filled: (employee.skills ?? []).length > 0 },
    { label: "LinkedIn", filled: !!employee.linkedinUrl },
  ];
  const filled = fields.filter((f) => f.filled).length;
  const missing = fields.filter((f) => !f.filled).map((f) => f.label);
  return { pct: Math.round((filled / fields.length) * 100), missing };
}
