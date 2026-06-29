type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
type ProjectStatus = "ACTIVE" | "PLANNING" | "COMPLETED" | "ON_HOLD";
type DealStage = "Negotiation" | "Proposal" | "Closed Won" | "Qualified" | "Discovery";
type OnlineStatus = "online" | "away" | "offline";

const FALLBACK_COLOR = "bg-slate-500/10 text-slate-600 dark:text-slate-400";

export const priorityColors: Record<Priority, string> = {
  URGENT: "bg-red-500/10 text-red-700 dark:text-red-400",
  HIGH: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  MEDIUM: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  LOW: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
};

export const projectStatusColors: Record<ProjectStatus, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  PLANNING: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  COMPLETED: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
  ON_HOLD: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export const stageColors: Record<DealStage, string> = {
  Negotiation: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  Proposal: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  "Closed Won": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Qualified: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Discovery: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

export const onlineStatusColors: Record<OnlineStatus, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-400 dark:bg-slate-600",
};

export const rankStyles = [
  {
    bg: "bg-gold/15 dark:bg-gold/20",
    text: "text-gold",
    border: "border-gold/30",
    ring: "ring-gold/20",
    label: "1st",
    barColor: "bg-gold",
    badgeColor: "bg-gold text-white",
  },
  {
    bg: "bg-slate-400/15 dark:bg-slate-400/20",
    text: "text-slate-500 dark:text-slate-300",
    border: "border-slate-400/30",
    ring: "ring-slate-400/20",
    label: "2nd",
    barColor: "bg-slate-400",
    badgeColor: "bg-slate-400 text-white",
  },
  {
    bg: "bg-amber-700/15 dark:bg-amber-700/20",
    text: "text-amber-700 dark:text-amber-600",
    border: "border-amber-700/30",
    ring: "ring-amber-700/20",
    label: "3rd",
    barColor: "bg-amber-700",
    badgeColor: "bg-amber-700 text-white",
  },
];

export const sprintStatusColors = {
  done: "bg-emerald-500",
  inProgress: "bg-blue-500",
  todo: "bg-slate-400",
} as const;

export const sparkColors = {
  blue: "#3B82F6",
  green: "#10B981",
  purple: "#8B5CF6",
  amber: "#F59E0B",
} as const;

type PayrollStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PAID";

export const payrollStatusColors: Record<PayrollStatus, string> = {
  DRAFT: "bg-slate-500/10 text-slate-700 border-slate-200",
  PENDING_APPROVAL: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  APPROVED: "bg-blue-500/10 text-blue-700 border-blue-200",
  PAID: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
};

type WfhStatus = "PENDING" | "APPROVED" | "REJECTED";

export const wfhStatusColors: Record<WfhStatus, string> = {
  APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
};

type HealthStatus = "healthy" | "at_risk" | "critical";

export const healthStatusColors: Record<HealthStatus, string> = {
  healthy: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  at_risk: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  critical: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export const healthDotColors: Record<HealthStatus, string> = {
  healthy: "bg-emerald-500",
  at_risk: "bg-amber-500",
  critical: "bg-red-500",
};

type CrmRole = "sales_rep" | "csm";

export const roleBadgeConfig: Record<CrmRole, { label: string; color: string }> = {
  sales_rep: { label: "Sales", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  csm: { label: "Customer Success", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
};

export const projectStatusDisplayLabels: Record<string, string> = {
  ACTIVE: "IN PROGRESS",
  PLANNING: "PLANNING",
  COMPLETED: "COMPLETED",
  ON_HOLD: "ON HOLD",
  ARCHIVED: "ARCHIVED",
};

export function getColorSafe<K extends string>(map: Record<K, string>, key: string): string {
  return (map as Record<string, string>)[key] ?? FALLBACK_COLOR;
}
