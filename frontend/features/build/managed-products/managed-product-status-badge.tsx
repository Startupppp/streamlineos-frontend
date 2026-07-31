import { memo } from "react";
import type { ManagedProductStatus } from "@/types/projects";
import { StatusMapBadge, type StatusEntry } from "@/components/ui/status-map-badge";

const MANAGED_PRODUCT_STATUS_MAP: Record<ManagedProductStatus, StatusEntry> = {
  active: { label: "Active", tone: "success" },
  archived: { label: "Archived", tone: "neutral", className: "dark:bg-muted/40" },
};

export const ManagedProductStatusBadge = memo(
  function ManagedProductStatusBadge({ status }: { status: ManagedProductStatus }) {
    return <StatusMapBadge status={status} map={MANAGED_PRODUCT_STATUS_MAP} />;
  },
);
