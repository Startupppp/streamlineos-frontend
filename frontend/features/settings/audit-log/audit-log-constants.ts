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

const ACTION_LABELS: Record<string, string> = {
  "org.archived": "Organization archived",
  "org.restored": "Organization restored",
  "org.created": "Organization created",
  "org.deleted": "Organization deleted",
  "org.switched": "Organization switched",
  "org.holiday.created": "Holiday added",
  "org.holiday.deleted": "Holiday removed",
  "org.domain.added": "Custom domain added",
  "org.domain.verified": "Custom domain verified",
  "org.domain.removed": "Custom domain removed",
  "role.changed": "Role updated",
  "user.login": "Signed in",
  "user.logout": "Signed out",
};

const UPPERCASE_WORDS = new Set(["api", "crm", "hr", "ip", "mfa", "sso", "pat", "kb"]);

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
  const known = ACTION_LABELS[action];
  if (known !== undefined) return known;
  const segments = action.split(".").filter(Boolean);
  const meaningful = segments[0] === "org" && segments.length > 1 ? segments.slice(1) : segments;
  const words = meaningful
    .flatMap((segment) => segment.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[\s_-]+/))
    .filter(Boolean)
    .map((word) => (UPPERCASE_WORDS.has(word.toLowerCase()) ? word.toUpperCase() : word.toLowerCase()));
  if (words.length === 0) return action;
  const [first, ...rest] = words;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
}

export function actionBadgeClass(action: string): string {
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(key)) return cls;
  }
  return "bg-muted text-muted-foreground border-border";
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  user: "User",
  org: "Organization",
  org_unit: "Org unit",
  webhook_endpoint: "Webhook",
  api_key: "API key",
  role: "Role",
  workflow: "Workflow",
  document: "Document",
  announcement: "Announcement",
  leave: "Leave",
  expense: "Expense",
  payroll: "Payroll",
  member: "Member",
  kb_page: "KB page",
  principal_group: "Principal group",
};

export function formatTargetType(targetType: string | null): string {
  if (!targetType) return "—";
  const lower = targetType.toLowerCase();
  const known = TARGET_TYPE_LABELS[lower];
  if (known !== undefined) return known;
  return targetType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
