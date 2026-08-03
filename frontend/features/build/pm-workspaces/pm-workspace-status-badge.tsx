import { memo } from "react";
import type { PmWorkspaceStatus } from "@/types/projects";
import { StatusMapBadge, type StatusEntry } from "@/components/ui/status-map-badge";

const PM_WORKSPACE_STATUS_MAP: Record<PmWorkspaceStatus, StatusEntry> = {
  active: { label: "Active", tone: "success" },
  archived: { label: "Archived", tone: "neutral", className: "dark:bg-muted/40" },
};

export const PmWorkspaceStatusBadge = memo(function PmWorkspaceStatusBadge({
  status,
}: {
  status: PmWorkspaceStatus;
}) {
  return <StatusMapBadge status={status} map={PM_WORKSPACE_STATUS_MAP} />;
});
