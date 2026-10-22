import type { PermissionKey } from "@/contracts/permission-key.generated";

export type FirstRunStepKey =
  | "holidays"
  | "leave"
  | "managers"
  | "employees"
  | "template"
  | "salaries"
  | "attendance"
  | "payroll";

export type FirstRunStep = {
  key: FirstRunStepKey;
  label: string;
  href: string;
  /** Who can do the step; others never see it. */
  permission: PermissionKey;
};

/** HRMS + payroll from an empty org to the first payslip, in the order that unblocks the next step. */
export const FIRST_RUN_STEPS: readonly FirstRunStep[] = [
  { key: "holidays", label: "Add company holidays", href: "/hr/holidays", permission: "hr:attendance:manage" },
  { key: "leave", label: "Set up leave types and policies", href: "/hr/leave-policies", permission: "hr:leaves:manage" },
  { key: "employees", label: "Add your employees", href: "/hr/onboarding", permission: "hr:onboarding:manage" },
  { key: "managers", label: "Set reporting managers", href: "/hr/settings/reporting-managers", permission: "hr:reporting-lines:manage" },
  { key: "template", label: "Choose a salary template", href: "/payroll/templates", permission: "payroll:policies:manage" },
  { key: "salaries", label: "Give each employee a salary", href: "/payroll/employees", permission: "payroll:salaries:update" },
  { key: "attendance", label: "Lock this month's attendance", href: "/payroll/inputs", permission: "hr:payroll:lock" },
  { key: "payroll", label: "Run payroll and publish payslips", href: "/payroll/runs", permission: "payroll:runs:manage" },
];

/** true = done, false = to do, null = this user cannot read the signal. */
export type FirstRunSignals = Record<FirstRunStepKey, boolean | null>;

export type FirstRunRow = FirstRunStep & { status: "done" | "next" | "todo" };

/** Steps this user can act on and read, with the first unfinished one marked "next". */
export function firstRunRows(
  signals: FirstRunSignals,
  allowed: Record<FirstRunStepKey, boolean>,
): FirstRunRow[] {
  const visible = FIRST_RUN_STEPS.filter((step) => allowed[step.key] && signals[step.key] !== null);
  const nextKey = visible.find((step) => signals[step.key] === false)?.key;
  return visible.map((step) => ({
    ...step,
    status: signals[step.key] ? "done" : step.key === nextKey ? "next" : "todo",
  }));
}
