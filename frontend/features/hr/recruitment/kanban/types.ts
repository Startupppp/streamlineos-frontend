import type { CandidateStatus, SlaCandidateStatus } from "@/types/hr";

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
    bg: "bg-slate-50/80 dark:bg-slate-900/30",
    border: "border-slate-200 dark:border-slate-700",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    headerGradient: "from-slate-500 to-slate-400",
    headerText: "text-white",
    dot: "bg-white/80",
  },
  {
    id: "SCREENING",
    label: "Screening",
    bg: "bg-blue-50/60 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    headerGradient: "from-blue-600 to-blue-500",
    headerText: "text-white",
    dot: "bg-white/80",
  },
  {
    id: "INTERVIEW",
    label: "Interview",
    bg: "bg-amber-50/60 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
    headerGradient: "from-amber-500 to-orange-400",
    headerText: "text-white",
    dot: "bg-white/80",
  },
  {
    id: "OFFER",
    label: "Offer",
    bg: "bg-blue-50/60 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    headerGradient: "from-blue-600 to-blue-500",
    headerText: "text-white",
    dot: "bg-white/80",
  },
  {
    id: "HIRED",
    label: "Hired",
    bg: "bg-emerald-50/60 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
    headerGradient: "from-emerald-600 to-teal-500",
    headerText: "text-white",
    dot: "bg-white/80",
  },
  {
    id: "REJECTED",
    label: "Rejected",
    bg: "bg-rose-50/60 dark:bg-rose-950/20",
    border: "border-rose-200 dark:border-rose-800",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200",
    headerGradient: "from-rose-500 to-red-400",
    headerText: "text-white",
    dot: "bg-white/80",
  },
];

export const SLA_CONFIG: Record<SlaCandidateStatus, { dot: string; label: string; title: string }> = {
  ON_TRACK: {
    dot: "bg-green-500",
    label: "text-green-700 dark:text-green-400",
    title: "SLA: On Track",
  },
  AT_RISK: {
    dot: "bg-amber-500",
    label: "text-amber-700 dark:text-amber-400",
    title: "SLA: At Risk",
  },
  BREACHED: {
    dot: "bg-red-500",
    label: "text-red-700 dark:text-red-400",
    title: "SLA: Breached",
  },
};

export const SLA_EMOJI: Record<SlaCandidateStatus, string> = {
  ON_TRACK: "🟢",
  AT_RISK: "🟡",
  BREACHED: "🔴",
};

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatDate(val: Date | string | null): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
