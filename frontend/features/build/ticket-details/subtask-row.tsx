"use client";

import { memo, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InlineStatus, InlinePriority, InlineAssignee } from "../views/card-inline-fields";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import type { ProjectStatusRecord } from "@/types/projects";

export interface CompactTicketRowData {
  id: number;
  title: string;
  status: string;
  priority?: string | null;
  points?: number | null;
  ticketNumber?: number | null;
  assigneeId?: string | null;
  projectId?: number | null;
  project?: { key?: string | null } | null;
  assignee?: {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

interface SubtaskRowProps {
  subtask: CompactTicketRowData;
  projectId: number;
  projectKey: string | null | undefined;
  projectStatuses: ProjectStatusRecord[];
  endAction?: ReactNode;
}

export const SubtaskRow = memo(function SubtaskRow({
  subtask,
  projectId,
  projectKey,
  projectStatuses,
  endAction,
}: SubtaskRowProps) {
  const resolvedProjectId = subtask.projectId ?? projectId;
  const resolvedProjectKey = subtask.project?.key ?? projectKey;
  const href =
    subtask.ticketNumber != null
      ? getTicketDetailHref(resolvedProjectId, resolvedProjectKey, subtask.ticketNumber)
      : null;

  const isDone = subtask.status === "DONE";
  const displayKey =
    resolvedProjectKey && subtask.ticketNumber != null
      ? `${resolvedProjectKey}-${subtask.ticketNumber}`
      : `#${subtask.ticketNumber ?? ""}`;

  const rowClassName =
    "group flex items-center gap-2 rounded-lg bg-muted/30 px-2 py-1.5 hover:bg-muted/60 transition-colors";

  const rowBody = (
    <>
      <span className="shrink-0" onClick={stopProp} onKeyDown={stopProp}>
        <InlineStatus
          ticketId={subtask.id}
          projectId={resolvedProjectId}
          currentStatus={subtask.status}
          projectStatuses={projectStatuses}
        />
      </span>

      <span className="text-micro font-mono text-muted-foreground/60 shrink-0 select-none">
        {displayKey}
      </span>

      <span
        className={cn(
          "min-w-0 max-w-full flex-1 truncate text-xs [overflow-wrap:anywhere]",
          isDone && "line-through text-muted-foreground",
        )}
        title={subtask.title}
      >
        {subtask.title}
      </span>

      {subtask.points != null && subtask.points > 0 && (
        <Badge
          variant="secondary"
          className="shrink-0 h-4 px-1 py-0 text-micro font-mono"
        >
          {subtask.points}
        </Badge>
      )}

      <span className="shrink-0" onClick={stopProp} onKeyDown={stopProp}>
        <InlinePriority
          ticketId={subtask.id}
          projectId={resolvedProjectId}
          currentPriority={subtask.priority}
        />
      </span>

      <span className="shrink-0" onClick={stopProp} onKeyDown={stopProp}>
        <InlineAssignee
          ticketId={subtask.id}
          projectId={resolvedProjectId}
          currentAssigneeId={subtask.assigneeId}
          assignee={subtask.assignee ?? null}
        />
      </span>

      {endAction}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rowClassName}>
        {rowBody}
      </Link>
    );
  }

  return <div className={rowClassName}>{rowBody}</div>;
});

function stopProp(e: React.MouseEvent | React.KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
}
