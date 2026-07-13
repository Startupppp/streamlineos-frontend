"use client";

import { memo } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { buildStatusConfig, getStatusEntry } from "../shared/types";
import {
  InlineStatus,
  InlinePriority,
  InlineAssignee,
  InlineEstimate,
  InlineTitle,
  InlineDescription,
  stopEvent,
} from "../views/card-inline-fields";
import { InlineLabels } from "../views/card-inline-extra-fields";
import { InlineDueDate, InlineStartDate } from "../views/card-inline-date-fields";
import type { ProjectStatusRecord, Ticket } from "@/types/projects";

interface EpicStoryRowProps {
  story: Ticket;
  projectId: number;
  projectStatuses?: ProjectStatusRecord[];
}

export const EpicStoryRow = memo(function EpicStoryRow({
  story,
  projectId,
  projectStatuses,
}: EpicStoryRowProps) {
  const canUpdate = useCan("projects:tickets:update");
  const canAssign = useCan("projects:tickets:assign");
  const isDone = story.status === "DONE";
  const labelIds = story.labels?.flatMap((l) => (l.label ? [l.label.id] : [])) ?? [];
  const statusConfig = buildStatusConfig(projectStatuses ?? []);
  const statusEntry = getStatusEntry(statusConfig, story.status);

  return (
    <div className="rounded-md bg-muted/40 p-2.5 transition-colors hover:bg-muted/60">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />

          {canUpdate ? (
            <InlineStatus
              ticketId={story.id}
              projectId={projectId}
              currentStatus={story.status}
              projectStatuses={projectStatuses}
            />
          ) : (
            <Badge
              variant="outline"
              className={cn("text-xs shrink-0", isDone && "border-green-500 text-green-500")}
            >
              {statusEntry.label}
            </Badge>
          )}

          {canUpdate ? (
            <InlineTitle
              ticketId={story.id}
              projectId={projectId}
              currentTitle={story.title}
              className={cn("max-w-[200px] sm:max-w-xs", isDone && "line-through text-muted-foreground")}
            />
          ) : (
            <span
              className={cn(
                "min-w-0 truncate text-sm font-semibold",
                isDone && "line-through text-muted-foreground",
              )}
            >
              {story.title}
            </span>
          )}

          {canUpdate ? (
            <>
              <InlinePriority
                ticketId={story.id}
                projectId={projectId}
                currentPriority={story.priority}
              />
              <InlineEstimate
                ticketId={story.id}
                projectId={projectId}
                currentPoints={story.points}
              />
              <InlineDueDate
                ticketId={story.id}
                projectId={projectId}
                currentDueDate={story.dueDate}
              />
              <InlineStartDate
                ticketId={story.id}
                projectId={projectId}
                currentStartDate={story.startDate}
              />
              <InlineLabels
                ticketId={story.id}
                projectId={projectId}
                currentLabelIds={labelIds}
              />
            </>
          ) : (
            story.points != null &&
            story.points > 0 && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {story.points} pts
              </Badge>
            )
          )}

          {(canAssign || canUpdate) && (
            <InlineAssignee
              ticketId={story.id}
              projectId={projectId}
              currentAssigneeId={story.assigneeId}
              assignee={story.assignee ?? null}
            />
          )}
        </div>

        <div className="shrink-0" onMouseDown={stopEvent} onClick={stopEvent}>
          <Link href={`/projects/${projectId}?ticket=${story.id}`}>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              View
            </Button>
          </Link>
        </div>
      </div>

      {(canUpdate || story.description) && (
        <div className="ml-5 mt-1 min-w-0">
          {canUpdate ? (
            <InlineDescription
              ticketId={story.id}
              projectId={projectId}
              currentDescription={story.description}
            />
          ) : (
            <p className="line-clamp-1 text-xs text-muted-foreground">{story.description}</p>
          )}
        </div>
      )}
    </div>
  );
});
