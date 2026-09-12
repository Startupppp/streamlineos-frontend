import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import type { PutawayTaskSummary } from "@/hooks/api/inventory/putaway";
import {
  PUTAWAY_TASK_STATUS_BADGE,
  PUTAWAY_TASK_STATUS_LABEL,
} from "@/features/inventory/lib/inventory-status";

function progressLabel(task: PutawayTaskSummary): string {
  return `${task.linesClosed}/${task.lineCount}`;
}

export function buildPutawayTaskColumns(): DataTableColumn<PutawayTaskSummary>[] {
  return [
    {
      key: "taskNumber",
      header: "Task",
      cell: (task) => (
        <span className="font-mono text-dense tabular-nums">{task.taskNumber}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (task) => (
        <Badge
          variant="outline"
          className={cn("h-4 px-1.5 py-0 text-micro", PUTAWAY_TASK_STATUS_BADGE[task.status])}
        >
          {PUTAWAY_TASK_STATUS_LABEL[task.status]}
        </Badge>
      ),
    },
    {
      key: "grnNumber",
      header: "Receipt",
      cell: (task) => (
        <span className="font-mono text-dense tabular-nums">{task.grnNumber ?? "—"}</span>
      ),
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "fromLocationCode",
      header: "From",
      cell: (task) => (
        <span className="font-mono text-dense">{task.fromLocationCode ?? "—"}</span>
      ),
    },
    {
      key: "progress",
      header: "Put away",
      cell: (task) => (
        <span className="font-mono tabular-nums">{progressLabel(task)}</span>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "quarantineLineCount",
      header: "Quarantine",
      cell: (task) =>
        task.quarantineLineCount > 0 ? (
          <span className="font-mono tabular-nums">{task.quarantineLineCount}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      className: "text-right hidden lg:table-cell",
      headerClassName: "text-right hidden lg:table-cell",
    },
    {
      key: "assignedToName",
      header: "Operator",
      cell: (task) => (
        <span className="text-sm text-muted-foreground">
          {task.assignedToName ?? (task.assignedTo ? "Assigned" : "Unclaimed")}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Raised",
      cell: (task) => (
        <span className="font-mono tabular-nums">{formatShortDate(task.createdAt)}</span>
      ),
      className: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
    },
  ];
}

export function renderPutawayTaskMobileCard(task: PutawayTaskSummary) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-sm tabular-nums">
          {task.taskNumber}
        </span>
        <Badge
          variant="outline"
          className={cn("h-5 px-2 py-0.5 text-micro", PUTAWAY_TASK_STATUS_BADGE[task.status])}
        >
          {PUTAWAY_TASK_STATUS_LABEL[task.status]}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">
          {task.fromLocationCode ?? "No location"} ·{" "}
          {task.assignedToName ?? (task.assignedTo ? "Assigned" : "Unclaimed")}
        </span>
        <span className="shrink-0 font-mono tabular-nums">
          {progressLabel(task)} lines
        </span>
      </div>
    </div>
  );
}
