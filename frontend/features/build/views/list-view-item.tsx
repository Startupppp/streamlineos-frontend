"use client";

import { memo, useCallback, useState, type MouseEvent } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { ChevronRightIcon } from "@animateicons/react/lucide";
import { TicketTypeIcon } from "../shared/ticket-type-icon";
import { getStatusDotClass } from "@/components/shared/ticket-status-badge";
import { formatTicketKey } from "@/components/shared/format-ticket-key";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlineStatus } from "./card-field-status";
import { InlinePriority } from "./card-field-priority";
import { InlineAssignee } from "./card-field-assignee";
import { InlineEstimate } from "./card-field-estimate";
import { InlineLabels, InlineModule } from "./card-inline-extra-fields";
import { InlineType } from "./card-inline-type-cycle";
import { InlineDueDate } from "./card-inline-date-fields";
import { pmSnappy } from "@/lib/motion-presets";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { ListViewItemProps } from "./list-view-shared";
import { useCan } from "@/hooks/api/access";
import { useModuleName } from "./module-names-context";

export const ListViewItem = memo(function ListViewItem({
  ticket,
  projectKey,
  projectId,
  projectStatuses,
  onClick,
  displayOptions,
  dragHandleProps,
  isDragging,
  isSelected,
  onSelect,
  isKeyboardFocused,
  layout = "standard",
}: ListViewItemProps) {
  const handleClick = useCallback(() => onClick(ticket.id), [onClick, ticket.id]);
  const handleSelectChange = useCallback(
    (v: boolean | "indeterminate") => {
      onSelect?.(ticket.id, v === true);
    },
    [onSelect, ticket.id],
  );
  const shouldReduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const handleContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setMenuOpen(true);
  }, []);
  const { iconRef: chevronIconRef, hoverHandlers: chevronHoverHandlers } = useAnimatedIcon();
  const canUpdate = useCan("build:tickets:update");
  const canAssign = useCan("build:tickets:assign");
  const moduleName = useModuleName(ticket.moduleId);
  const resolvedProjectId = projectId ?? ticket.project?.id;
  const resolvedProjectKey = projectKey ?? ticket.project?.key;

  const showId = displayOptions?.showId ?? true;
  const showPriority = displayOptions?.showPriority ?? true;
  const showAssignee = displayOptions?.showAssignee ?? true;
  const showEstimate = displayOptions?.showEstimate ?? true;
  const showLabels = displayOptions?.showLabels ?? true;
  const showDueDate = displayOptions?.showDueDate ?? true;
  const showCycle = displayOptions?.showCycle ?? true;

  const labelIds = ticket.labels
    ?.map((l) => l.label?.id)
    .filter((v): v is number => v != null) ?? [];

  const assigneeUsers =
    ticket.assignees?.flatMap((entry) => (entry.user ? [entry.user] : [])) ?? [];
  const primaryAssignee = assigneeUsers[0] ?? ticket.assignee ?? null;
  const extraAssigneeCount = Math.max(0, assigneeUsers.length - 1);
  const otherAssigneeNames = assigneeUsers
    .slice(1)
    .map((user) => getUserDisplayName(user))
    .join(", ");

  const hasProjectId = resolvedProjectId != null;
  const hasDragHandle = dragHandleProps != null;
  const version = ticket.version;

  return (
    <motion.div
      data-keyboard-focused={isKeyboardFocused ? "true" : undefined}
      aria-current={isKeyboardFocused ? "true" : undefined}
      className={cn(
        "group flex items-center border-b border-border/50 bg-card transition-colors hover:bg-primary/[0.04] last:border-b-0",
        layout === "work-index" && "min-h-12 hover:bg-primary/[0.035]",
        isDragging && "shadow-lg ring-1 ring-primary/20 bg-primary/5 rounded-md",
        isKeyboardFocused &&
          "bg-primary/[0.06] ring-1 ring-inset ring-primary/40",
      )}
      onContextMenu={handleContextMenu}
      initial={shouldReduceMotion ? false : { opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={pmSnappy}
      whileHover={
        isDragging || shouldReduceMotion
          ? undefined
          : { x: 1 }
      }
    >
      {onSelect !== undefined && (
        <div className="flex-shrink-0 pl-2 pr-0.5">
          <Checkbox
            checked={isSelected ?? false}
            onCheckedChange={handleSelectChange}
            aria-label={`Select ${ticket.title ?? "ticket"}`}
          />
        </div>
      )}
      {hasDragHandle && (
        <div
          {...dragHandleProps}
          className="flex-shrink-0 pl-2 pr-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "flex flex-1 min-w-0 items-center gap-2 px-3 py-1.5",
          layout === "work-index" &&
            "flex-wrap gap-x-2 gap-y-1.5 px-3 py-2.5 sm:flex-nowrap sm:px-4",
        )}
      >
        {hasProjectId && canUpdate ? (
          <InlineStatus
            ticketId={ticket.id}
            projectId={resolvedProjectId}
            version={version}
            currentStatus={ticket.status}
            projectStatuses={projectStatuses}
          />
        ) : (
          <div className={cn("h-2 w-2 rounded-full flex-shrink-0", getStatusDotClass(ticket.status))} />
        )}
        {hasProjectId && canUpdate ? (
          <InlineType
            ticketId={ticket.id}
            projectId={resolvedProjectId}
            version={version}
            currentType={ticket.type}
          />
        ) : (
          <TicketTypeIcon type={ticket.type} size="sm" />
        )}
        {showId && (
          <span
            className={cn(
              "text-xs text-muted-foreground font-mono flex-shrink-0",
              layout === "work-index" &&
                "rounded-md bg-muted/70 px-1.5 py-0.5 font-medium text-foreground/70 ring-1 ring-inset ring-border/50",
            )}
          >
            {formatTicketKey(resolvedProjectKey, ticket.ticketNumber, ticket.sequenceId ?? undefined)}
          </span>
        )}
        <button
          onClick={handleClick}
          className={cn(
            "min-w-0 flex-1 overflow-hidden text-left text-sm text-foreground hover:underline underline-offset-2",
            layout === "work-index" &&
              "order-first w-full basis-full font-medium leading-5 sm:order-none sm:w-auto sm:basis-0",
          )}
          aria-label={`Open ${ticket.title}`}
        >
          <TruncatedText text={ticket.title} />
        </button>
        {showLabels && hasProjectId && canUpdate && (
          <span className={cn(layout === "work-index" && "hidden sm:inline-flex")}>
            <InlineLabels
              ticketId={ticket.id}
              projectId={resolvedProjectId}
              currentLabelIds={labelIds}
            />
          </span>
        )}
        {showPriority && hasProjectId && canUpdate ? (
          <InlinePriority
            ticketId={ticket.id}
            projectId={resolvedProjectId}
            version={version}
            currentPriority={ticket.priority}
          />
        ) : showPriority && ticket.priority ? (
          <span className="text-xs font-normal flex-shrink-0 text-muted-foreground">{ticket.priority}</span>
        ) : null}
        {showEstimate && hasProjectId && canUpdate ? (
          <span className={cn(layout === "work-index" && "hidden md:inline-flex")}>
            <InlineEstimate
              ticketId={ticket.id}
              projectId={resolvedProjectId}
              version={version}
              currentPoints={ticket.points}
            />
          </span>
        ) : showEstimate && ticket.points != null && ticket.points > 0 ? (
          <Badge
            variant="outline"
            className={cn(
              "text-xs flex-shrink-0",
              layout === "work-index" && "hidden md:inline-flex",
            )}
          >
            {ticket.points}pt
          </Badge>
        ) : null}
        {showDueDate && hasProjectId && canUpdate && (
          <span className={cn(layout === "work-index" && "hidden md:inline-flex")}>
            <InlineDueDate
              ticketId={ticket.id}
              projectId={resolvedProjectId}
              version={version}
              currentDueDate={ticket.dueDate}
            />
          </span>
        )}
        {showAssignee && hasProjectId && canAssign ? (
          <InlineAssignee
            ticketId={ticket.id}
            projectId={resolvedProjectId}
            version={version}
            currentAssigneeId={ticket.assigneeId ?? primaryAssignee?.id}
            assignee={primaryAssignee}
          />
        ) : showAssignee && primaryAssignee ? (
          <Avatar className="h-6 w-6 flex-shrink-0" title={getUserDisplayName(primaryAssignee)}>
            <AvatarImage src={resolveImageUrl(primaryAssignee.image)} />
            <AvatarFallback className="text-micro">{getUserInitials(primaryAssignee)}</AvatarFallback>
          </Avatar>
        ) : null}
        {showAssignee && extraAssigneeCount > 0 ? (
          <span
            className="flex-shrink-0 text-xs tabular-nums text-muted-foreground"
            title={otherAssigneeNames}
          >
            +{extraAssigneeCount}
          </span>
        ) : null}
        {showCycle && ticket.cycle ? (
          <Badge
            variant="outline"
            className={cn(
              "text-xs flex-shrink-0",
              layout === "work-index" && "hidden lg:inline-flex",
            )}
          >
            {ticket.cycle.name}
          </Badge>
        ) : null}
        {hasProjectId && canUpdate ? (
          <InlineModule
            ticketId={ticket.id}
            projectId={resolvedProjectId}
            version={version}
            currentModuleId={ticket.moduleId}
          />
        ) : moduleName !== null ? (
          <Badge
            variant="secondary"
            className={cn(
              "text-xs flex-shrink-0",
              layout === "work-index" && "hidden lg:inline-flex",
            )}
          >
            {moduleName}
          </Badge>
        ) : null}
        <button
          onClick={handleClick}
          className="ml-1 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open ticket"
          {...chevronHoverHandlers}
        >
          <ChevronRightIcon ref={chevronIconRef} size={16} />
        </button>
      </div>
      <div className="pr-2 flex-shrink-0">
        <TicketQuickActions
          ticketId={ticket.id}
          projectId={resolvedProjectId}
          projectKey={resolvedProjectKey ?? undefined}
          ticketNumber={ticket.ticketNumber}
          onOpen={onClick}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          className="opacity-0 translate-x-1 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100"
        />
      </div>
    </motion.div>
  );
});

