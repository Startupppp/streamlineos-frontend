import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import type { PortfolioStatus, PortfolioHealth } from "@/types/projects";

const STATUS_STYLE: Record<PortfolioStatus, string> = {
  active: "text-emerald-600 border-emerald-200",
  on_hold: "text-amber-600 border-amber-200",
  completed: "text-blue-600 border-blue-200",
  archived: "text-slate-500 border-slate-200",
};

const STATUS_LABEL: Record<PortfolioStatus, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

const HEALTH_STYLE: Record<PortfolioHealth, string> = {
  on_track: "text-emerald-600 border-emerald-200",
  at_risk: "text-amber-600 border-amber-200",
  off_track: "text-red-600 border-red-200",
};

const HEALTH_LABEL: Record<PortfolioHealth, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  off_track: "Off Track",
};

export const PortfolioStatusBadge = memo(function PortfolioStatusBadge({ status }: { status: PortfolioStatus }) {
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </Badge>
  );
});

export const PortfolioHealthBadge = memo(function PortfolioHealthBadge({ health }: { health: PortfolioHealth | null }) {
  if (!health) return null;
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${HEALTH_STYLE[health]}`}>
      {HEALTH_LABEL[health]}
    </Badge>
  );
});