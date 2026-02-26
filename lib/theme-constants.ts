/** Centralized color/style mappings shared across dashboard pages */

export type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
export type ProjectStatus = "ACTIVE" | "PLANNING" | "COMPLETED" | "ON_HOLD";
export type DealStage = "Negotiation" | "Proposal" | "Closed Won" | "Qualified" | "Discovery";
export type EventStatus = "confirmed" | "planning";
export type OnlineStatus = "online" | "away" | "offline";
export type CampaignStatus = "active" | "paused" | "completed";

const VALID_CAMPAIGN_STATUSES: ReadonlySet<string> = new Set(["active", "paused", "completed"]);

export function isCampaignStatus(value: unknown): value is CampaignStatus {
  return typeof value === "string" && VALID_CAMPAIGN_STATUSES.has(value);
}

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

export const eventStatusColors: Record<EventStatus, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  planning: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

export const onlineStatusColors: Record<OnlineStatus, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-400 dark:bg-slate-600",
};

export const campaignStatusConfig: Record<CampaignStatus, { color: string; bg: string }> = {
  active: { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  paused: { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10" },
  completed: { color: "text-slate-700 dark:text-slate-400", bg: "bg-slate-500/10" },
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

/** Sprint ticket status colors (used in sprint-card) */
export const sprintStatusColors = {
  done: "bg-emerald-500",
  inProgress: "bg-blue-500",
  todo: "bg-slate-400",
} as const;

/** Semantic spark-line hex colors for MetricCard */
export const sparkColors = {
  blue: "#3B82F6",
  green: "#10B981",
  purple: "#8B5CF6",
  amber: "#F59E0B",
} as const;

/** Safe lookup with fallback for any color map */
export function getColorSafe<K extends string>(map: Record<K, string>, key: string): string {
  return (map as Record<string, string>)[key] ?? FALLBACK_COLOR;
}
