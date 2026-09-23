"use client";

import { useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { KanbanTicket, DisplayOptions } from "../shared/types";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlinePriority, InlineAssignee, InlineEstimate } from "./card-inline-fields";
import { InlineType, InlineLabels, InlineCycle } from "./card-inline-extra-fields";
import { InlineDueDate, InlineStartDate } from "./card-inline-date-fields";
import { TEXT_TWO_LINES } from "@/lib/text-overflow";
import { getUserDisplayName } from "@/lib/person-display";
import { Calendar } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { useCan } from "@/hooks/api/access";

interface KanbanTicketCardProps {
  ticket: KanbanTicket;
  projectId?: number;
  projectKey?: string;
  isDragging: boolean;
  onSelect: (id: number) => void;
  isSelected?: boolean;
  onSelectedChange?: (id: number, next: boolean) => void;
  displayOptions?: DisplayOptions;
}

export const KanbanTicketCard = memo(function KanbanTicketCard({
  ticket,
  projectId,
  projectKey,
  isDragging,
  onSelect,
  isSelected,
  onSelectedChange,
  displayOptions,
}: KanbanTicketCardProps) {
  const canUpdate = useCan("build:tickets:update");
  const canAssign = useCan("build:tickets:assign");
  const handleActivate = useCallback(() => {
    onSelect(ticket.id);
  }, [ticket.id, onSelect]);
  const handleSelectedChange = useCallback(
    (next: boolean | "indeterminate") => {
      onSelectedChange?.(ticket.id, next === true);
    },
    [ticket.id, onSelectedChange],
  );

  const ticketKey = projectKey
    ? `${projectKey}-${ticket.ticketNumber}`
    : `#${ticket.ticketNumber ?? ""}`;

  const assigneeUsers =
    ticket.assignees?.flatMap((entry) => (entry.user ? [entry.user] : [])) ?? [];
  const primaryAssignee = assigneeUsers[0] ?? ticket.assignee ?? null;
  const extraCount = Math.max(
    0,
    (assigneeUsers.length || (primaryAssignee ? 1 : 0)) - 1,
  );

  const showId = displayOptions?.showId ?? true;
  const showPriority = displayOptions?.showPriority ?? true;
  const showAssignee = displayOptions?.showAssignee ?? true;
  const showEstimate = displayOptions?.showEstimate ?? true;
  const showCycle = displayOptions?.showCycle ?? true;
  const showLabels = displayOptions?.showLabels ?? true;
  const showDescription = displayOptions?.showDescription ?? false;
  const showDueDate = displayOptions?.showDueDate ?? true;

  const points = ticket.points ?? ticket.storyPoints;
  const createdDate = parseDisplayDate(ticket.createdAt);

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-sm",
        "cursor-grab active:cursor-grabbing will-change-transform",
        isDragging
          ? "z-20 rotate-1 scale-[1.02] border-primary/30 bg-card opacity-95 shadow-xl ring-1 ring-primary/25"
          : "hover:border-border hover:shadow-md",
      )}
    >
      <div className="flex items-start gap-1.5">
        {onSelectedChange !== undefined && (
          <div className="flex-shrink-0 pt-0.5">
            <Checkbox
              checked={isSelected ?? false}
              onCheckedChange={handleSelectedChange}
              aria-label={`Select ${ticket.title ?? "ticket"}`}
            />
          </div>
        )}
        <button
          type="button"
          onClick={handleActivate}
          className={cn(
            TEXT_TWO_LINES,
            "min-w-0 flex-1 text-left text-sm font-semibold leading-snug text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          )}
        >
          {ticket.title}
        </button>
        <TicketQuickActions
          ticketId={ticket.id}
          projectId={projectId}
          className="-mr-1 -mt-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
        />
      </div>

      {showDescription && ticket.descriptionExcerpt ? (
        <p className={cn(TEXT_TWO_LINES, "mt-1 text-dense leading-relaxed text-muted-foreground")}>
          {ticket.descriptionExcerpt}
        </p>
      ) : null}

      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        {showId ? (
          <span className="shrink-0 font-mono text-dense tabular-nums text-muted-foreground">
            {ticketKey}
          </span>
        ) : null}

        {showPriority && projectId && canUpdate ? (
          <InlinePriority
            ticketId={ticket.id}
            projectId={projectId}
            currentPriority={ticket.priority}
            showLabel
          />
        ) : null}

        {projectId && canUpdate ? (
          <InlineType
            ticketId={ticket.id}
            projectId={projectId}
            currentType={ticket.type}
            showLabel
          />
        ) : null}

        {showLabels && projectId && canUpdate ? (
          <InlineLabels
            ticketId={ticket.id}
            projectId={projectId}
            currentLabelIds={
              ticket.labels?.flatMap((l) => (l.label ? [l.label.id] : [])) ?? []
            }
          />
        ) : null}

        {showEstimate && projectId && canUpdate ? (
          <InlineEstimate
            ticketId={ticket.id}
            projectId={projectId}
            currentPoints={points}
          />
        ) : null}

        {showCycle && projectId && canUpdate ? (
          <InlineCycle
            ticketId={ticket.id}
            projectId={projectId}
            currentCycleId={ticket.cycleId}
          />
        ) : null}

        {projectId && canUpdate ? (
          <InlineStartDate
            ticketId={ticket.id}
            projectId={projectId}
            currentStartDate={ticket.startDate}
          />
        ) : null}
      </div>

      <div className="mt-2.5 flex min-w-0 items-center justify-between gap-2 border-t border-border/60 pt-2">
        {showDueDate && projectId && canUpdate ? (
          <InlineDueDate
            ticketId={ticket.id}
            projectId={projectId}
            currentDueDate={ticket.dueDate}
            fallbackDate={ticket.createdAt}
          />
        ) : createdDate ? (
          <span className="inline-flex items-center gap-1 text-dense tabular-nums text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {format(createdDate, "MMM d, yyyy")}
          </span>
        ) : (
          <span />
        )}

        {showAssignee && projectId && canAssign ? (
          <div className="ml-1 flex min-w-0 shrink items-center gap-1.5">
            <InlineAssignee
              ticketId={ticket.id}
              projectId={projectId}
              currentAssigneeId={ticket.assigneeId ?? primaryAssignee?.id ?? null}
              assignee={primaryAssignee}
            />
            {primaryAssignee ? (
              <span className="min-w-0 truncate text-dense font-medium text-muted-foreground">
                {getUserDisplayName(primaryAssignee)}
              </span>
            ) : null}
            {extraCount > 0 ? (
              <span className="shrink-0 text-dense tabular-nums text-muted-foreground">
                +{extraCount}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});

function parseDisplayDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}
