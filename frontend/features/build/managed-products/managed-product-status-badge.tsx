import { memo } from "react";
import { StatusMapBadge, type StatusEntry } from "@/components/ui/status-map-badge";

const MANAGED_PRODUCT_STATUS_MAP: Record<string, StatusEntry> = {
  active: { label: "Active", tone: "success" },
  archived: { label: "Archived", tone: "neutral", className: "dark:bg-muted/40" },
  on_track: { label: "On track", tone: "success" },
  at_risk: { label: "At risk", tone: "warning" },
  off_track: { label: "Off track", tone: "danger" },
  unknown: { label: "Unknown", tone: "neutral" },
};

export const ManagedProductStatusBadge = memo(
  function ManagedProductStatusBadge({ status }: { status: string }) {
    return <StatusMapBadge status={status} map={MANAGED_PRODUCT_STATUS_MAP} />;
  },
);
