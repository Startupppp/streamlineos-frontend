"use client";

import { useCallback, memo, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { KanbanTicket, DisplayOptions } from "../shared/types";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlinePriority } from "./card-field-priority";
import { InlineAssignee } from "./card-field-assignee";
import { InlineEstimate } from "./card-field-estimate";
import { InlineLabels, InlineModule } from "./card-inline-extra-fields";
import { InlineType, InlineCycle } from "./card-inline-type-cycle";
import { InlineDueDate, InlineStartDate } from "./card-inline-date-fields";
import { TEXT_TWO_LINES } from "@/lib/text-overflow";
import { getUserDisplayName } from "@/lib/person-display";
import { Calendar } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { useCan } from "@/hooks/api/access";
import { Badge } from "@/components/ui/badge";
import { useModuleName } from "./module-names-context";

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
  const moduleName = useModuleName(ticket.moduleId);
  const handleActivate = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onSelect(ticket.id);
    },
    [ticket.id, onSelect],
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const handleContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setMenuOpen(true);
  }, []);
  const handleSelectedChange = useCallback(
    (next: boolean | "indeterminate") => {
      onSelectedChange?.(ticket.id, next === true);
    },
    [ticket.id, onSelectedChange],
  );

  const ticketKey =
    projectKey && ticket.ticketNumber != null
      ? `${projectKey}-${ticket.ticketNumber}`
      : `#${ticket.ticketNumber ?? ticket.id}`;

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
  const version = ticket.version;
  const labelIds =
    ticket.labels?.flatMap((label) => (label.label ? [label.label.id] : [])) ?? [];
  const showPlanningRow =
    projectId !== undefined &&
    canUpdate &&
    (showEstimate || showCycle || Boolean(ticket.startDate));

  return (
    <div
      data-selected={isSelected ? "true" : undefined}
      className={cn(
        "group relative rounded-xl border border-border/70 bg-card p-3 shadow-sm",
        "cursor-grab active:cursor-grabbing will-change-transform",
        "motion-safe:transition-[border-color,box-shadow,transform,background-color] motion-safe:duration-200 motion-reduce:transform-none",
        isSelected && "border-foreground/40 bg-accent ring-1 ring-foreground/15",
        isDragging
          ? "z-20 rotate-1 scale-[1.02] border-foreground/30 bg-card opacity-95 shadow-xl ring-1 ring-foreground/25 motion-reduce:rotate-0 motion-reduce:scale-100"
          : "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md focus-within:border-foreground/30 focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring motion-reduce:hover:translate-y-0",
      )}
      onContextMenu={handleContextMenu}
    >
      <div className="flex items-start gap-2">
        {onSelectedChange !== undefined && (
          <div className="flex h-7 flex-shrink-0 items-center pt-0.5">
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
            "min-w-0 flex-1 rounded-sm text-left text-sm font-semibold leading-snug text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          {ticket.title}
        </button>
        <TicketQuickActions
          ticketId={ticket.id}
          projectId={projectId}
          projectKey={projectKey}
          ticketNumber={ticket.ticketNumber}
          onOpen={onSelect}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          className="-mr-1 -mt-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [&_button]:h-8 [&_button]:w-8"
        />
      </div>

      {showDescription && ticket.descriptionExcerpt ? (
        <p className={cn(TEXT_TWO_LINES, "mt-1.5 text-dense leading-relaxed text-muted-foreground")}>
          {ticket.descriptionExcerpt}
        </p>
      ) : null}

      <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5">
        {showId ? (
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-micro font-medium tabular-nums text-muted-foreground">
            {ticketKey}
          </span>
        ) : null}

        {showPriority && projectId && canUpdate ? (
          <InlinePriority
            ticketId={ticket.id}
            projectId={projectId}
            version={version}
            currentPriority={ticket.priority}
            showLabel
          />
        ) : null}

        {projectId && canUpdate ? (
          <InlineType
            ticketId={ticket.id}
            projectId={projectId}
            version={version}
            currentType={ticket.type}
            showLabel
          />
        ) : null}

        {showLabels && projectId && canUpdate ? (
          <InlineLabels
            ticketId={ticket.id}
            projectId={projectId}
            currentLabelIds={labelIds}
          />
        ) : null}

        {projectId !== undefined && canUpdate ? (
          <InlineModule
            ticketId={ticket.id}
            projectId={projectId}
            version={version}
            currentModuleId={ticket.moduleId}
          />
        ) : moduleName !== null ? (
          <Badge variant="secondary" className="max-w-full shrink truncate text-micro font-medium">
            {moduleName}
          </Badge>
        ) : null}
      </div>

      {showPlanningRow && projectId !== undefined ? (
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md bg-muted/45 px-1.5 py-1">
          {showEstimate ? (
            <InlineEstimate
              ticketId={ticket.id}
              projectId={projectId}
              version={version}
              currentPoints={points}
            />
          ) : null}

          {showCycle ? (
            <InlineCycle
              ticketId={ticket.id}
              projectId={projectId}
              version={version}
              currentCycleId={ticket.cycleId}
            />
          ) : null}

          {ticket.startDate ? (
            <InlineStartDate
              ticketId={ticket.id}
              projectId={projectId}
              version={version}
              currentStartDate={ticket.startDate}
            />
          ) : null}
        </div>
      ) : null}

      <div className="mt-2.5 flex min-w-0 items-center justify-between gap-2 border-t border-border/60 pt-2.5">
        {showDueDate && projectId && canUpdate ? (
          <InlineDueDate
            ticketId={ticket.id}
            projectId={projectId}
            version={version}
            currentDueDate={ticket.dueDate}
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
              version={version}
              currentAssigneeId={ticket.assigneeId ?? primaryAssignee?.id ?? null}
              assignee={primaryAssignee}
            />
            {primaryAssignee ? (
              <span className="min-w-0 truncate text-dense font-normal text-muted-foreground">
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
