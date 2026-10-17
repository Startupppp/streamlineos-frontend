export interface ExitPathStep {
  key: string;
  label: string;
  detail: string;
  href: string | null;
  permission?: "hr:exit:manage" | "hr:payroll:approve" | "hr:assets:view" | "payroll:fnf:view";
  external?: boolean;
  unavailableNote?: string;
}

export const ALUMNI_NOT_AVAILABLE_COPY = "Alumni record — proposed / not available yet";

export const EXIT_PATH_STEPS: readonly ExitPathStep[] = [
  {
    key: "request",
    label: "Resignation",
    detail: "Last working day in IST and a reason, from the employee or HR.",
    href: null,
  },
  {
    key: "termination",
    label: "Termination",
    detail: "The involuntary path. Completing it asks for a final confirmation.",
    href: "/hr/termination",
    permission: "hr:exit:manage",
  },
  {
    key: "fnf",
    label: "Full and final draft",
    detail: "Record basic dues, leave encashment, bonus, deductions and loan recovery as a draft.",
    href: "/hr/fnf",
    permission: "hr:payroll:approve",
  },
  {
    key: "assets",
    label: "Asset returns",
    detail: "Log what comes back before the last working day.",
    href: "/hr/asset-returns",
    permission: "hr:assets:view",
  },
  {
    key: "settlement",
    label: "Payroll settlement",
    detail: "Payroll owns the settlement itself. Not proven end to end by this redesign.",
    href: "/payroll/fnf",
    permission: "payroll:fnf:view",
    external: true,
  },
  {
    key: "alumni",
    label: "Former employee record",
    detail: ALUMNI_NOT_AVAILABLE_COPY,
    href: null,
    unavailableNote: ALUMNI_NOT_AVAILABLE_COPY,
  },
];

export const REASSIGN_REPORTS_HREF = "/hr/employees/reporting-changes";

export const REASSIGN_REPORTS_COPY =
  "An exiting manager's reports need a new manager or their approvals stall. The exit list does not carry reporting lines, so check them in Reporting changes before the last working day.";
