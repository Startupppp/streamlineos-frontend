import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import type { PmWorkspaceStatus } from "@/types/projects";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<PmWorkspaceStatus, string> = {
  active:
    "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  archived: "text-muted-foreground border-border bg-muted dark:bg-muted/40",
};

const STATUS_LABEL: Record<PmWorkspaceStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export const PmWorkspaceStatusBadge = memo(function PmWorkspaceStatusBadge({
  status,
}: {
  status: PmWorkspaceStatus;
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
