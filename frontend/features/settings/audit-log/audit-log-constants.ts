import type { SearchParamsReader } from "@/lib/list-pagination";
import type { AuditLogFilters } from "@/hooks/api/audit-log";

export const ACTION_COLORS: Record<string, string> = {
  "user.login": "bg-status-success-surface text-status-success-ink border-status-success-rule",
  "user.logout": "bg-muted text-muted-foreground border-border",
  "user.deactivated": "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  "org.member_invited": "bg-status-info-surface text-status-info-ink border-status-info-rule",
  "org.member_removed": "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  "org.member_role_changed": "bg-status-info-surface text-status-info-ink border-status-info-rule",
  "org.archived": "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  "org.restored": "bg-status-success-surface text-status-success-ink border-status-success-rule",
  "org.ownership_transferred": "bg-status-info-surface text-status-info-ink border-status-info-rule",
  "org.businessUnit": "bg-status-info-surface text-status-info-ink border-status-info-rule",
  "org.branch": "bg-status-info-surface text-status-info-ink border-status-info-rule",
  "org.department": "bg-status-info-surface text-status-info-ink border-status-info-rule",
  // Sits beside org.branch and org.department, which are both info. The
  // fuchsia was an inconsistency rather than a category of its own.
  "org.team": "bg-status-info-surface text-status-info-ink border-status-info-rule",
  "org.holiday": "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  "org.domain": "bg-status-info-surface text-status-info-ink border-status-info-rule",
  "org.setup": "bg-status-success-surface text-status-success-ink border-status-success-rule",
  "expense.approved": "bg-status-success-surface text-status-success-ink border-status-success-rule",
  "expense.rejected": "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  "hr.leave_approved": "bg-status-success-surface text-status-success-ink border-status-success-rule",
  "hr.leave_rejected": "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  "hr.payroll_generated": "bg-status-info-surface text-status-info-ink border-status-info-rule",
  "role.changed": "bg-status-info-surface text-status-info-ink border-status-info-rule",
  "settings.updated": "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  "file.upload": "bg-status-info-surface text-status-info-ink border-status-info-rule",
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
  return PAGE_SIZE_OPTIONS.some((candidate) => candidate === n);
}

export const DEFAULT_AUDIT_LOG_PAGE_SIZE: PageSize = 15;

export function readAuditLogPageSize(params: SearchParamsReader): PageSize {
  const parsed = Number(params.get("size"));
  return isValidPageSize(parsed) ? parsed : DEFAULT_AUDIT_LOG_PAGE_SIZE;
}

// The one place the audit-log URL becomes a query key, so the server prefetch and the page agree.
export function readAuditLogFilters(params: SearchParamsReader): AuditLogFilters {
  const action = params.get("action") || "all";
  const targetType = params.get("target") || "all";
  return {
    cursor: undefined,
    limit: readAuditLogPageSize(params),
    action: action !== "all" ? action : undefined,
    targetType: targetType !== "all" ? targetType : undefined,
    dateFrom: params.get("from") || undefined,
    dateTo: params.get("to") || undefined,
    userSearch: params.get("user") || undefined,
  };
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
