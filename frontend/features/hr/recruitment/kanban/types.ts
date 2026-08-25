import type { CandidateStatus, SlaCandidateStatus } from "@/types/hr";
export { getInitials } from "@/lib/format-utils";

export interface ColumnConfig {
  id: CandidateStatus;
  label: string;
  bg: string;
  border: string;
  badge: string;
  headerGradient: string;
  headerText: string;
  dot: string;
}

export const COLUMNS: ColumnConfig[] = [
  {
    id: "NEW",
    label: "New",
    bg: "bg-muted",
    border: "border-border",
    badge: "bg-muted text-muted-foreground dark:bg-slate-700",
    headerGradient: "from-slate-500 to-slate-400",
    headerText: "text-white",
    dot: "bg-white/80",
  },
  {
    id: "SCREENING",
    label: "Screening",
    bg: "bg-status-info-surface",
    border: "border-status-info-rule",
    badge: "bg-status-info-surface text-status-info-ink dark:bg-blue-900",
    headerGradient: "from-blue-600 to-blue-500",
    headerText: "text-white",
    dot: "bg-white/80",
  },
  {
    id: "INTERVIEW",
    label: "Interview",
    bg: "bg-status-warning-surface",
    border: "border-status-warning-rule",
    badge: "bg-status-warning-surface text-status-warning-ink dark:bg-amber-900",
    headerGradient: "from-amber-500 to-orange-400",
    headerText: "text-white",
    dot: "bg-white/80",
  },
  {
    id: "OFFER",
    label: "Offer",
    bg: "bg-status-info-surface",
    border: "border-status-info-rule",
    badge: "bg-status-info-surface text-status-info-ink dark:bg-blue-900",
    headerGradient: "from-blue-600 to-blue-500",
    headerText: "text-white",
    dot: "bg-white/80",
  },
  {
    id: "HIRED",
    label: "Hired",
    bg: "bg-status-success-surface",
    border: "border-status-success-rule",
    badge: "bg-status-success-surface text-status-success-ink dark:bg-emerald-900",
    headerGradient: "from-emerald-600 to-teal-500",
    headerText: "text-white",
    dot: "bg-white/80",
  },
  {
    id: "REJECTED",
    label: "Rejected",
    bg: "bg-status-danger-surface",
    border: "border-status-danger-rule",
    badge: "bg-status-danger-surface text-status-danger-ink dark:bg-rose-900",
    headerGradient: "from-rose-500 to-red-400",
    headerText: "text-white",
    dot: "bg-white/80",
  },
];

export const SLA_CONFIG: Record<SlaCandidateStatus, { dot: string; label: string; title: string }> = {
  ON_TRACK: {
    dot: "bg-green-500",
    label: "text-status-success-ink",
    title: "SLA: On Track",
  },
  AT_RISK: {
    dot: "bg-amber-500",
    label: "text-status-warning-ink",
    title: "SLA: At Risk",
  },
  BREACHED: {
    dot: "bg-red-500",
    label: "text-status-danger-ink",
    title: "SLA: Breached",
  },
};

export function formatDate(val: Date | string | null): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
