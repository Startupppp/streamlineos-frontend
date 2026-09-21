import { STATE_COLORS, PRIORITY_COLORS } from "./project-charts";
import type { ProjectAnalytics } from "@/types/projects";

export const MUTED_FILL = "hsl(var(--muted-foreground))";

export function buildStateData(analytics: ProjectAnalytics | undefined) {
  if (!analytics?.stateDistribution) return [];
  return analytics.stateDistribution.map((row) => {
    const state = row.status ?? "unknown";
    return {
      state: state
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase()),
      count: row.count,
      fill: STATE_COLORS[state.toLowerCase()] ?? MUTED_FILL,
    };
  });
}

export function buildPriorityData(analytics: ProjectAnalytics | undefined) {
  if (!analytics?.priorityBreakdown) return [];
  return analytics.priorityBreakdown.map((row) => {
    const priority = row.priority ?? "none";
    return {
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: row.count,
      fill: PRIORITY_COLORS[priority.toLowerCase()] ?? MUTED_FILL,
    };
  });
}

export function buildVolumeData(analytics: ProjectAnalytics | undefined) {
  if (!analytics?.volumeOverTime) return [];
  return analytics.volumeOverTime.map((entry) => ({
    date: entry.week ?? "",
    created: entry.count,
  }));
}

export function buildAssigneeData(analytics: ProjectAnalytics | undefined) {
  if (!analytics?.assigneeCompletion) return [];
  return analytics.assigneeCompletion.map((entry) => ({
    name: entry.assigneeName ?? "Unassigned",
    completed: entry.completed,
    total: entry.total,
    rate: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
  }));
}

export function buildVelocityData(analytics: ProjectAnalytics | undefined) {
  if (!analytics?.cycleVelocity) return [];
  return analytics.cycleVelocity.map((entry) => ({
    cycle: entry.cycleName ?? "Deleted cycle",
    points: entry.completedPoints,
  }));
}

export function buildEstimateData(analytics: ProjectAnalytics | undefined) {
  if (!analytics?.estimateVsActual) return [];
  return analytics.estimateVsActual.map((entry) => ({
    label: entry.title || `#${entry.ticketId}`,
    estimate: entry.estimated ? parseFloat(entry.estimated) : 0,
    actual: entry.actual,
  }));
}
