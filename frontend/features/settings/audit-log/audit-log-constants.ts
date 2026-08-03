export const ACTION_COLORS: Record<string, string> = {
  "user.login": "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  "user.logout": "bg-muted text-muted-foreground border-border",
  "user.deactivated": "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  "org.member_invited": "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  "org.member_removed": "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  "org.member_role_changed": "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  "org.archived": "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  "org.restored": "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  "org.ownership_transferred": "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  "org.businessUnit": "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  "org.branch": "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  "org.department": "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  "org.team": "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:border-fuchsia-500/30",
  "org.holiday": "bg-orange-500/10 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  "org.domain": "bg-cyan-500/10 text-cyan-600 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
  "org.setup": "bg-teal-500/10 text-teal-600 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30",
  "expense.approved": "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  "expense.rejected": "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  "hr.leave_approved": "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  "hr.leave_rejected": "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  "hr.payroll_generated": "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  "role.changed": "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  "settings.updated": "bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  "file.upload": "bg-sky-500/10 text-sky-600 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
};

export const ACTION_LABELS: Record<string, string> = {
  "org.archived": "Org Archived",
  "org.restored": "Org Restored",
  "org.ownership_transferred": "Ownership Transferred",
  "org.setup.completed": "Setup Completed",
  "org.businessUnit.created": "Business Unit Created",
  "org.businessUnit.updated": "Business Unit Updated",
  "org.businessUnit.deleted": "Business Unit Deleted",
  "org.branch.created": "Branch Created",
  "org.branch.updated": "Branch Updated",
  "org.branch.deleted": "Branch Deleted",
  "org.department.created": "Department Created",
  "org.department.updated": "Department Updated",
  "org.department.deleted": "Department Deleted",
  "org.team.created": "Team Created",
  "org.team.updated": "Team Updated",
  "org.team.deleted": "Team Deleted",
  "org.holiday.created": "Holiday Added",
  "org.holiday.deleted": "Holiday Removed",
  "org.domain.added": "Custom Domain Added",
  "org.domain.verified": "Custom Domain Verified",
  "org.domain.removed": "Custom Domain Removed",
  "role.changed": "Role Updated",
  "user.registered": "User Registered",
  "user.login": "Login",
  "user.logout": "Logout",
  "user.deactivated": "User Deactivated",
  "org.member_invited": "Member Invited",
  "org.member_removed": "Member Removed",
  "org.member_role_changed": "Member Role Changed",
};

export const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export function isValidPageSize(n: number): n is PageSize {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n);
}

export function formatActionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" — ");
}

export function actionBadgeClass(action: string): string {
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(key)) return cls;
  }
  return "bg-muted text-muted-foreground border-border";
}
