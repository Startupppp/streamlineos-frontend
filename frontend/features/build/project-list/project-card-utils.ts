import { differenceInDays, format, isPast } from "date-fns";
import type { ProjectListItem } from "@/types/projects/projects";

export const statusStripe: Record<string, string> = {
  ACTIVE: "border-l-emerald-500",
  PLANNING: "border-l-blue-500",
  COMPLETED: "border-l-slate-400",
  ON_HOLD: "border-l-amber-500",
  ARCHIVED: "border-l-slate-400 dark:border-l-slate-600",
};

export const statusDotColors: Record<string, string> = {
  ACTIVE: "bg-status-success-fill",
  PLANNING: "bg-status-info-fill",
  COMPLETED: "bg-status-neutral-fill",
  ON_HOLD: "bg-status-warning-fill",
  ARCHIVED: "bg-status-neutral-fill",
};

export const avatarTints: Record<string, string> = {
  ACTIVE: "bg-status-success-surface text-status-success-ink ring-status-success-rule",
  PLANNING: "bg-status-info-surface text-status-info-ink ring-status-info-rule",
  COMPLETED: "bg-muted text-muted-foreground ring-border",
  ON_HOLD: "bg-status-warning-surface text-status-warning-ink ring-status-warning-rule",
  ARCHIVED: "bg-muted text-muted-foreground ring-border",
};

type DateTone = "muted" | "soon" | "overdue";

export interface DateMeta {
  label: string;
  tone: DateTone;
}

export const dateToneClasses: Record<DateTone, string> = {
  muted: "text-muted-foreground",
  soon: "text-status-warning-ink",
  overdue: "text-status-danger-ink",
};

export function resolveDateMeta(
  endDate: Date | string | null,
  startDate: Date | string | null,
  status: string,
): DateMeta | null {
  const terminal = status === "COMPLETED" || status === "ARCHIVED";
  if (endDate) {
    const date = new Date(endDate);
    const label = `Due ${format(date, "MMM d")}`;
    if (!terminal && isPast(date)) {
      return { label, tone: "overdue" };
    }
    const daysLeft = differenceInDays(date, new Date());
    if (!terminal && daysLeft >= 0 && daysLeft <= 7) {
      return { label, tone: "soon" };
    }
    return { label, tone: "muted" };
  }
  if (startDate) {
    return { label: format(new Date(startDate), "'Started' MMM d"), tone: "muted" };
  }
  return null;
}

export function buildTeamMembers(project: ProjectListItem) {
  if (project.manager && !project.members.some((member) => member.id === project.manager?.id)) {
    return [project.manager, ...project.members];
  }
  return project.members;
}
