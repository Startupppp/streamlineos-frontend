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
  OPEN: "bg-blue-100 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-violet-100 text-violet-700 border-violet-200",
  WAITING: "bg-amber-100 text-amber-700 border-amber-200",
  RESOLVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
};

export const PRIORITY_COLORS: Record<SupportTicketPriority, string> = {
  LOW: "bg-slate-100 text-slate-700 border-slate-200",
  MEDIUM: "bg-blue-100 text-blue-700 border-blue-200",
  HIGH: "bg-amber-100 text-amber-700 border-amber-200",
  URGENT: "bg-red-100 text-red-700 border-red-200",
};
