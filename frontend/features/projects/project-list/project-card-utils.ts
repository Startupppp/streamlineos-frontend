import { differenceInDays, format, isPast } from "date-fns";
import type { ProjectListItem } from "@/types/projects/projects";

export const statusAccentBar: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  PLANNING: "bg-blue-500",
  COMPLETED: "bg-slate-400",
  ON_HOLD: "bg-amber-500",
  ARCHIVED: "bg-slate-300 dark:bg-slate-600",
};

export const statusDotColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  PLANNING: "bg-blue-500",
  COMPLETED: "bg-slate-400",
  ON_HOLD: "bg-amber-500",
  ARCHIVED: "bg-slate-400",
};

export const avatarTints: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  PLANNING: "bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-400",
  COMPLETED: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-400",
  ON_HOLD: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400",
  ARCHIVED: "bg-slate-500/10 text-slate-500 ring-slate-500/20 dark:text-slate-500",
};

type DateTone = "muted" | "soon" | "overdue";

export interface DateMeta {
  label: string;
  tone: DateTone;
}

export const dateToneClasses: Record<DateTone, string> = {
  muted: "text-muted-foreground",
  soon: "text-amber-600 dark:text-amber-400",
  overdue: "text-red-600 dark:text-red-400",
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
    return { label: format(new Date(startDate), "Started MMM d"), tone: "muted" };
  }
  return null;
}

export function buildTeamMembers(project: ProjectListItem) {
  if (project.manager && !project.members.some((member) => member.id === project.manager?.id)) {
    return [project.manager, ...project.members];
  }
  return project.members;
}
