import { memo } from "react";

import { StatusMapBadge, type StatusEntry } from "@/components/ui/status-map-badge";

const PORTFOLIO_STATUS_MAP: Record<string, StatusEntry> = {
  active: { label: "Active", tone: "success" },
  on_hold: { label: "On Hold", tone: "warning" },
  completed: { label: "Completed", tone: "info" },
  archived: { label: "Archived", tone: "neutral", className: "dark:bg-muted/40" },
};

const PORTFOLIO_HEALTH_MAP: Record<string, StatusEntry> = {
  on_track: { label: "On Track", tone: "success" },
  at_risk: { label: "At Risk", tone: "warning" },
  off_track: { label: "Off Track", tone: "danger" },
};

export const PortfolioStatusBadge = memo(function PortfolioStatusBadge({
  status,
}: {
  status: string;
}) {
  return <StatusMapBadge status={status} map={PORTFOLIO_STATUS_MAP} />;
});

export const PortfolioHealthBadge = memo(function PortfolioHealthBadge({
  health,
}: {
  health: string | null;
}) {
  if (!health) return null;
  return <StatusMapBadge status={health} map={PORTFOLIO_HEALTH_MAP} />;
});
