import type { PortalTicketCategory } from "@/hooks/api/support/portal";
import type { SupportTicketStatus, SupportTicketPriority } from "@/types/support";

export const PORTAL_CATEGORY_OPTIONS: { value: PortalTicketCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "billing", label: "Billing" },
  { value: "bug_report", label: "Bug Report" },
  { value: "feature_request", label: "Feature Request" },
  { value: "onboarding", label: "Onboarding" },
  { value: "internal_it", label: "Internal IT" },
];

const CATEGORY_LABEL_MAP: Record<string, string> = {
  general: "General",
  billing: "Billing",
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  onboarding: "Onboarding",
  internal_it: "Internal IT",
};

export function formatCategoryLabel(category: string | null): string {
  if (!category) return "General";
  return CATEGORY_LABEL_MAP[category] ?? category.replace(/_/g, " ");
}

export const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING: "Waiting on you",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const STATUS_COLORS: Record<SupportTicketStatus, string> = {
  OPEN: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  IN_PROGRESS: "bg-primary/10 text-foreground border-primary/20 dark:bg-primary/10 dark:text-foreground dark:border-primary/20",
  WAITING: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  RESOLVED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  CLOSED: "bg-muted text-muted-foreground border-border",
};

export const PRIORITY_COLORS: Record<SupportTicketPriority, string> = {
  LOW: "bg-muted text-muted-foreground border-border",
  MEDIUM: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  HIGH: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  URGENT: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};
