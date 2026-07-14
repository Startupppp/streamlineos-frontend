import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import type { PortfolioStatus, PortfolioHealth } from "@/types/projects";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<PortfolioStatus, string> = {
  active:
    "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  on_hold:
    "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  completed:
    "text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  archived: "text-muted-foreground border-border bg-muted dark:bg-muted/40",
};

const STATUS_LABEL: Record<PortfolioStatus, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

const HEALTH_STYLE: Record<PortfolioHealth, string> = {
  on_track:
    "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  at_risk:
    "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  off_track:
    "text-red-700 border-red-200 bg-red-50 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

const HEALTH_LABEL: Record<PortfolioHealth, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  off_track: "Off Track",
};

export const PortfolioStatusBadge = memo(function PortfolioStatusBadge({
  status,
}: {
  status: PortfolioStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("px-1.5 py-0.5 text-[10px]", STATUS_STYLE[status])}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
});

export const PortfolioHealthBadge = memo(function PortfolioHealthBadge({
  health,
}: {
  health: PortfolioHealth | null;
}) {
  if (!health) return null;
  return (
    <Badge
      variant="outline"
      className={cn("px-1.5 py-0.5 text-[10px]", HEALTH_STYLE[health])}
    >
      {HEALTH_LABEL[health]}
    </Badge>
  );
});
