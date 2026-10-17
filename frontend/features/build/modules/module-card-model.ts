import type { ModuleStatus } from "@/types/projects/shared";

interface ModuleStatusStyle {
  label: string;
  stripe: string;
  accentBar: string;
  badge: string;
  progressBar: string;
  avatar: string;
}

export const MODULE_STATUS_STYLES: Record<ModuleStatus, ModuleStatusStyle> = {
  backlog: {
    label: "Backlog",
    stripe: "border-l-slate-400",
    accentBar: "from-gradient-neutral-from to-transparent",
    badge: "bg-muted text-foreground border-border",
    progressBar: "from-gradient-neutral-from to-gradient-neutral-to",
    avatar: "bg-muted text-muted-foreground ring-border",
  },
  planned: {
    label: "Planned",
    stripe: "border-l-blue-400 dark:border-l-blue-500",
    accentBar: "from-gradient-info-from to-transparent",
    badge: "bg-status-info-surface text-status-info-ink-strong border-status-info-rule",
    progressBar: "from-gradient-info-from to-gradient-info-to",
    avatar: "bg-status-info-surface text-status-info-ink ring-status-info-rule",
  },
  "in-progress": {
    label: "In Progress",
    stripe: "border-l-blue-600 dark:border-l-blue-500",
    accentBar: "from-gradient-info-from via-blue-500/30 to-transparent",
    badge: "bg-status-info-surface text-status-info-ink-strong border-status-info-rule",
    progressBar: "from-gradient-info-from via-blue-500 to-gradient-info-to",
    avatar: "bg-status-info-surface text-status-info-ink ring-status-info-rule",
  },
  paused: {
    label: "Paused",
    stripe: "border-l-amber-500",
    accentBar: "from-gradient-warning-from to-transparent",
    badge: "bg-status-warning-surface text-status-warning-ink-strong border-status-warning-rule",
    progressBar: "from-gradient-warning-from to-gradient-warning-to",
    avatar: "bg-status-warning-surface text-status-warning-ink ring-status-warning-rule",
  },
  completed: {
    label: "Completed",
    stripe: "border-l-emerald-500",
    accentBar: "from-gradient-success-from to-transparent",
    badge: "bg-status-success-surface text-status-success-ink-strong border-status-success-rule",
    progressBar: "from-gradient-success-from to-gradient-success-to",
    avatar: "bg-status-success-surface text-status-success-ink ring-status-success-rule",
  },
  cancelled: {
    label: "Cancelled",
    stripe: "border-l-red-500",
    accentBar: "from-gradient-danger-from to-transparent",
    badge: "bg-status-danger-surface text-status-danger-ink-strong border-status-danger-rule",
    progressBar: "from-gradient-danger-from to-gradient-danger-to",
    avatar: "bg-status-danger-surface text-status-danger-ink ring-status-danger-rule",
  },
};

export function formatModuleDate(value: string | null): string {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString("en-IN", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}
