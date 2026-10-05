import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { isPast, isToday, parseISO } from "date-fns";
import type { MyWorkItem } from "@/types/projects/my-work";
import type { ProjectListItem } from "@/types/projects";

export const PROJECT_HEALTH_LABEL: Record<ProjectListItem["health"], string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
};

const PROJECT_HEALTH_TONE: Record<ProjectListItem["health"], StatusTone> = {
  on_track: "success",
  at_risk: "warning",
  off_track: "danger",
};

export function projectHealthClasses(
  health: ProjectListItem["health"],
): string {
  const tone = statusToneClasses(PROJECT_HEALTH_TONE[health]);
  return cn(tone.surface, tone.ink, tone.rule);
}

export const STATUS_COLOR: Record<string, string> = {
  ACTIVE:
    "text-status-success-ink-strong border-status-success-rule bg-status-success-surface",
  PLANNING:
    "text-status-info-ink-strong border-status-info-rule bg-status-info-surface",
  ON_HOLD:
    "text-status-warning-ink-strong border-status-warning-rule bg-status-warning-surface",
  COMPLETED: "text-muted-foreground border-border bg-muted",
  ARCHIVED: "text-muted-foreground border-border bg-muted",
};

export function isOverdue(item: MyWorkItem): boolean {
  if (!item.dueDate) return false;
  try {
    const d = parseISO(item.dueDate);
    return isPast(d) && !isToday(d) && item.status !== "DONE";
  } catch {
    return false;
  }
}
