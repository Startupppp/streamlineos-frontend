"use client";

import { memo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InlineStatus, InlinePriority, InlineAssignee } from "../views/card-inline-fields";
import { getTicketDetailHref } from "../shared/format-ticket-key";
import type { Ticket } from "@/types/projects";
import type { ProjectStatusRecord } from "@/types/projects";

interface SubtaskRowProps {
  subtask: Ticket;
  projectId: number;
  projectKey: string | null | undefined;
  projectStatuses: ProjectStatusRecord[];
}

export const SubtaskRow = memo(function SubtaskRow({
  subtask,
  projectId,
  projectKey,
  projectStatuses,
}: SubtaskRowProps) {
  const href = getTicketDetailHref(
    subtask.projectId ?? projectId,
    subtask.project?.key ?? projectKey,
    subtask.ticketNumber,
  );

  const isDone = subtask.status === "DONE";
  const displayKey =
    subtask.project?.key && subtask.ticketNumber != null
      ? `${subtask.project.key}-${subtask.ticketNumber}`
      : `#${subtask.ticketNumber ?? subtask.id}`;

  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-lg bg-muted/30 px-2 py-1.5 hover:bg-muted/60 transition-colors"
    >
      <span
        className="shrink-0"
        onClick={stopProp}
        onKeyDown={stopProp}
      >
        <InlineStatus
          ticketId={subtask.id}
          projectId={subtask.projectId ?? projectId}
          currentStatus={subtask.status}
          projectStatuses={projectStatuses}
        />
      </span>

      <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0 select-none">
        {displayKey}
      </span>

      <span
        className={cn(
          "flex-1 min-w-0 truncate text-xs",
          isDone && "line-through text-muted-foreground",
        )}
      >
        {subtask.title}
      </span>

      {subtask.points != null && subtask.points > 0 && (
        <Badge
          variant="secondary"
          className="shrink-0 h-4 px-1 py-0 text-[9px] font-mono"
        >
          {subtask.points}
        </Badge>
      )}

      <span
        className="shrink-0"
        onClick={stopProp}
        onKeyDown={stopProp}
      >
        <InlinePriority
          ticketId={subtask.id}
          projectId={subtask.projectId ?? projectId}
          currentPriority={subtask.priority}
        />
      </span>

      <span
        className="shrink-0"
        onClick={stopProp}
        onKeyDown={stopProp}
      >
        <InlineAssignee
          ticketId={subtask.id}
          projectId={subtask.projectId ?? projectId}
          currentAssigneeId={subtask.assigneeId}
          assignee={subtask.assignee ?? null}
        />
      </span>
    </Link>
  );
});

function stopProp(e: React.MouseEvent | React.KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
}
