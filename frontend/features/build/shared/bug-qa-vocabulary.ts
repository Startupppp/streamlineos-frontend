import type { BugSeverity, BugStatus } from "@/types/projects";

export const BUG_STATUSES: readonly BugStatus[] = [
  "new",
  "triaged",
  "assigned",
  "in_progress",
  "fixed",
  "ready_for_qa",
  "verified",
  "reopened",
  "closed",
];

export const BUG_SEVERITIES: readonly BugSeverity[] = [
  "blocker",
  "critical",
  "major",
  "minor",
  "trivial",
];

export const BUG_SEVERITY_STYLES: Record<string, string> = {
  blocker:
    "text-status-danger-ink border-status-danger-rule bg-status-danger-surface",
  critical: "text-status-danger-ink border-status-danger-rule",
  major: "text-status-warning-ink border-status-warning-rule",
  minor: "text-muted-foreground border-border",
  trivial: "text-muted-foreground border-border",
};

export const BUG_STATUS_STYLES: Record<string, string> = {
  new: "text-muted-foreground border-border",
  triaged: "text-status-info-ink border-status-info-rule",
  assigned: "text-status-info-ink border-status-info-rule",
  in_progress: "text-status-warning-ink border-status-warning-rule",
  fixed: "text-status-success-ink border-status-success-rule",
  ready_for_qa: "text-status-info-ink border-status-info-rule",
  verified: "text-status-success-ink border-status-success-rule",
  reopened: "text-category-orange-ink border-category-orange-rule",
  closed: "text-muted-foreground border-border",
};

export const BUG_STATUS_LABELS: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  assigned: "Assigned",
  in_progress: "In Progress",
  fixed: "Fixed",
  ready_for_qa: "Ready for QA",
  verified: "Verified",
  reopened: "Reopened",
  closed: "Closed",
};

export const BUG_FALLBACK_STYLE = "text-muted-foreground border-border";

export function bugStatusLabel(status: string | null | undefined): string {
  if (!status) return "Not set";
  return BUG_STATUS_LABELS[status] ?? status;
}

export function bugStatusStyle(status: string | null | undefined): string {
  if (!status) return BUG_FALLBACK_STYLE;
  return BUG_STATUS_STYLES[status] ?? BUG_FALLBACK_STYLE;
}

export function bugSeverityStyle(severity: string | null | undefined): string {
  if (!severity) return BUG_FALLBACK_STYLE;
  return BUG_SEVERITY_STYLES[severity] ?? BUG_FALLBACK_STYLE;
}
