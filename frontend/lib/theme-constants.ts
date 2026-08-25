type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
type ProjectStatus = "ACTIVE" | "PLANNING" | "COMPLETED" | "ON_HOLD";
type OnlineStatus = "online" | "away" | "offline";

const FALLBACK_COLOR = "bg-muted text-muted-foreground";

export const priorityColors: Record<Priority, string> = {
  URGENT: "bg-status-danger-surface text-status-danger-ink",
  HIGH: "bg-status-warning-surface text-status-warning-ink",
  MEDIUM: "bg-status-warning-surface text-status-warning-ink",
  LOW: "bg-muted text-muted-foreground",
};

export const projectStatusColors: Record<ProjectStatus, string> = {
  ACTIVE: "bg-status-success-surface text-status-success-ink",
  PLANNING: "bg-status-info-surface text-status-info-ink",
  COMPLETED: "bg-muted text-muted-foreground",
  ON_HOLD: "bg-status-warning-surface text-status-warning-ink",
};

export const onlineStatusColors: Record<OnlineStatus, string> = {
  online: "bg-status-success-fill",
  away: "bg-status-warning-fill",
  offline: "bg-status-neutral-fill",
};

export const sprintStatusColors = {
  done: "bg-status-success-fill",
  inProgress: "bg-status-info-fill",
  todo: "bg-status-neutral-fill",
} as const;

export const sparkColors = {
  blue: "#3B82F6",
  green: "#10B981",
  purple: "#8B5CF6",
  amber: "#F59E0B",
} as const;

type WfhStatus = "PENDING" | "APPROVED" | "REJECTED";

export const wfhStatusColors: Record<WfhStatus, string> = {
  APPROVED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  REJECTED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  PENDING: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
};

type HealthStatus = "healthy" | "at_risk" | "critical";

export const healthStatusColors: Record<HealthStatus, string> = {
  healthy: "bg-status-success-surface text-status-success-ink",
  at_risk: "bg-status-warning-surface text-status-warning-ink",
  critical: "bg-status-danger-surface text-status-danger-ink",
};

export const healthDotColors: Record<HealthStatus, string> = {
  healthy: "bg-status-success-fill",
  at_risk: "bg-status-warning-fill",
  critical: "bg-status-danger-fill",
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
