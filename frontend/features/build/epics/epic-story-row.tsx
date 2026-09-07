"use client";

import { memo } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { buildStatusConfig } from "../shared/types";
import { getStatusEntry } from "@/lib/status-config";
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
import {
  InlineDueDate,
  InlineStartDate,
} from "../views/card-inline-date-fields";
import type { ProjectStatusRecord, Ticket } from "@/types/projects";
import { PM_ROW } from "@/components/pm-chrome/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";

interface EpicStoryRowProps {
  story: Ticket;
  projectId: number;
  projectKey?: string | null;
  projectStatuses?: ProjectStatusRecord[];
}

export const EpicStoryRow = memo(function EpicStoryRow({
  story,
  projectId,
  projectKey,
  projectStatuses,
}: EpicStoryRowProps) {
  const canUpdate = useCan("build:tickets:update");
  const canAssign = useCan("build:tickets:assign");
  const isDone = story.status === "DONE";
  const labelIds =
    story.labels?.flatMap((l) => (l.label ? [l.label.id] : [])) ?? [];
  const statusConfig = buildStatusConfig(projectStatuses ?? []);
  const statusEntry = getStatusEntry(statusConfig, story.status);
  const detailHref = getTicketDetailHref(
    projectId,
    projectKey,
    story.ticketNumber,
  );

  return (
    <div
      className={cn(
        PM_ROW,
        "rounded-md border-b-0 bg-muted/25 px-2 py-1.5 last:border-b-0",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <BookOpen
              className="h-3 w-3 shrink-0 text-primary"
              aria-hidden="true"
            />

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
                className={cn(
                  "h-5 shrink-0 px-1.5 text-micro",
                  isDone &&
                    "border-status-success-rule text-status-success-ink",
                )}
              >
                {statusEntry.label}
              </Badge>
            )}

            {canUpdate ? (
              <InlineTitle
                ticketId={story.id}
                projectId={projectId}
                currentTitle={story.title}
                className={cn(
                  "min-w-0 max-w-[min(100%,18rem)] sm:max-w-xs",
                  isDone && "text-muted-foreground line-through",
                )}
              />
            ) : (
              <TruncatedText
                text={story.title}
                className={cn(
                  "max-w-[min(100%,18rem)] text-xs font-semibold sm:max-w-xs",
                  isDone && "text-muted-foreground line-through",
                )}
              />
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
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 px-1.5 text-micro"
                >
                  {story.points} pts
                </Badge>
              )
            )}

            {canAssign || canUpdate ? (
              <InlineAssignee
                ticketId={story.id}
                projectId={projectId}
                currentAssigneeId={story.assigneeId}
                assignee={story.assignee ?? null}
              />
            ) : null}
          </div>

          <div className="shrink-0" onMouseDown={stopEvent} onClick={stopEvent} onKeyDown={stopEvent}>
            <Link href={detailHref}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-dense"
              >
                View
              </Button>
            </Link>
          </div>
        </div>

        {canUpdate ? (
          <div className="ml-4 min-w-0">
            <InlineDescription
              ticketId={story.id}
              projectId={projectId}
              currentDescription={story.description ?? null}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
});
