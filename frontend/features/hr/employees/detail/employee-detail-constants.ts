import type { EmployeeData } from "@/features/hr/employees/detail/edit-employee-form";

export const LIFECYCLE_BADGE: Record<string, { label: string; className: string }> = {
  CANDIDATE: {
    label: "Candidate",
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
  },
  PRE_JOINING: {
    label: "Pre-joining",
    className:
      "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  },
  ONBOARDING: {
    label: "Onboarding",
    className:
      "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30",
  },
  ACTIVE: {
    label: "Active",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  PROBATION: {
    label: "Probation",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  CONFIRMED: {
    label: "Confirmed",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  NOTICE: {
    label: "Notice",
    className:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  },
  EXITED: {
    label: "Exited",
    className:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
  },
  ALUMNI: {
    label: "Alumni",
    className: "bg-muted text-muted-foreground border-border",
  },
  SUSPENDED: {
    label: "Suspended",
    className:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
  },
};

export function getInitials(first?: string | null, last?: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

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
