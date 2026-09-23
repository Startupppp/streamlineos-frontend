import type { LeaveType, Approver } from "./components/leaves-shared";

export interface LeaveSetupBlocker {
  submitLabel: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}

export function leaveSetupBlocker(
  leaveTypes: readonly LeaveType[],
  approvers: readonly Approver[],
): LeaveSetupBlocker | null {
  if (leaveTypes.length === 0)
    return {
      submitLabel: "Leave types not set up",
      title: "No leave types yet",
      description:
        "Add the leave types your team takes — Casual, Sick and Earned cover most India SMBs — then come back to request time off.",
      actionLabel: "Set up leave types",
      href: "/hr/leaves?tab=types",
    };

  if (approvers.length === 0)
    return {
      submitLabel: "No approver assigned",
      title: "Nobody can approve this yet",
      description:
        "A request needs a reporting manager, or an admin who can approve leave. Assign a manager to this person, or ask the organisation owner to approve leave for the team.",
      actionLabel: "Assign a reporting manager",
      href: "/hr/org-chart",
    };

  return null;
}
