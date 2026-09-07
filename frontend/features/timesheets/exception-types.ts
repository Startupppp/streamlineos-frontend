export type ExceptionSeverity = "ERROR" | "WARNING";
export type ExceptionStatus = "OPEN" | "RESOLVED" | "DISMISSED";
export type ExceptionRule =
  | "MISSING_TIMESHEET"
  | "UNDER_HOURS"
  | "OVER_MAX_DAILY"
  | "UNRESOLVED_TIMER"
  | "MISSING_RATE";

export interface TimesheetExceptionRecord {
  id: number;
  orgId: string;
  userMembershipId: number | null;
  periodId: number | null;
  entryId: number | null;
  rule: ExceptionRule;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  message: string;
  details: unknown;
  ownerMembershipId: number | null;
  dueDate: string | null;
  resolutionReason: string | null;
  resolvedByMembershipId: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetException extends TimesheetExceptionRecord {
  user: { membershipId: number | null; name: string | null; email: string | null };
}

export interface ExceptionsSummary {
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  openBySeverity: Record<string, number>;
}

export interface ExceptionsQueryInput {
  status?: ExceptionStatus;
  severity?: ExceptionSeverity;
  rule?: ExceptionRule;
  userId?: string;
  cursor?: string;
  limit?: number;
}

export interface RunDetectionResult {
  week: { start: string; end: string };
  candidates: number;
  created: number;
}

export const EXCEPTION_RULE_LABEL: Record<ExceptionRule, string> = {
  MISSING_TIMESHEET: "Missing timesheet",
  UNDER_HOURS: "Under hours",
  OVER_MAX_DAILY: "Over max daily",
  UNRESOLVED_TIMER: "Unresolved timer",
  MISSING_RATE: "Missing rate",
};

export const EXCEPTION_SEVERITY_LABEL: Record<ExceptionSeverity, string> = {
  ERROR: "Error",
  WARNING: "Warning",
};

export const EXCEPTION_SEVERITY_BADGE: Record<ExceptionSeverity, string> = {
  ERROR:
    "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  WARNING:
    "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
};

export const EXCEPTION_STATUS_LABEL: Record<ExceptionStatus, string> = {
  OPEN: "Open",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export const EXCEPTION_STATUS_BADGE: Record<ExceptionStatus, string> = {
  OPEN: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  RESOLVED:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  DISMISSED:
    "bg-muted text-foreground border-border",
};
