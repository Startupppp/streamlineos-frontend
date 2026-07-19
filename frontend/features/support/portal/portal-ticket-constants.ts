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
  OPEN: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  IN_PROGRESS: "bg-primary/10 text-foreground border-primary/20 dark:bg-primary/10 dark:text-foreground dark:border-primary/20",
  WAITING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  CLOSED: "bg-muted text-muted-foreground border-border",
};

export const PRIORITY_COLORS: Record<SupportTicketPriority, string> = {
  LOW: "bg-muted text-muted-foreground border-border",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  HIGH: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  URGENT: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};
