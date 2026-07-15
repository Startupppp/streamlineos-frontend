"use client";

import { useMemo, memo, useCallback, useState, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn, resolveImageUrl } from "@/lib/utils";
import { ChevronRight, Plus, X, User, GripVertical } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { TicketTypeIcon } from "../shared/ticket-type-icon";
import { getStatusDotClass } from "../shared/status-badge";
import { formatTicketKey } from "../shared/format-ticket-key";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { TicketQuickActions } from "./ticket-quick-actions";
import { InlineStatus, InlinePriority, InlineAssignee, InlineEstimate } from "./card-inline-fields";
import { InlineType, InlineLabels } from "./card-inline-extra-fields";
import { InlineDueDate } from "./card-inline-date-fields";
import { useCreateTicket, useUpdateTicket, useUpdateTicketOrder } from "@/hooks/api";
import type { UpdateTicketInput } from "@/types/projects";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { DisplayOptions } from "../shared/types";
import { pmSnappy } from "@/features/projects/shared/pm-motion";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";

export interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  priority?: string | null;
  points?: number | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  assigneeId?: string | null;
  cycleId?: number | null;
  sprintId?: number | null;
  dueDate?: string | null;
  startDate?: string | null;
  order?: number | null;
  assignee?: { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; image?: string | null } | null;
  labels?: { label?: { id: number; name: string; color?: string | null } }[];
  cycle?: { id: number; name: string; status: string; startDate: string; endDate: string } | null;
}

interface ListViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
  groupBy?: string;
  rowBy?: string;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  displayOptions?: DisplayOptions;
  showEmptyRows?: boolean;
  showEmptyColumns?: boolean;
}

interface ListViewItemProps {
  ticket: Ticket;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  onClick: (id: number) => void;
  displayOptions?: DisplayOptions;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isDragging?: boolean;
}

const ListViewItem = memo(function ListViewItem({
  ticket,
  projectKey,
  projectId,
  projectStatuses,
  onClick,
  displayOptions,
  dragHandleProps,
  isDragging,
}: ListViewItemProps) {
  const handleClick = useCallback(() => onClick(ticket.id), [onClick, ticket.id]);
  const shouldReduceMotion = useReducedMotion();

  const showId = displayOptions?.showId ?? true;
  const showPriority = displayOptions?.showPriority ?? true;
  const showAssignee = displayOptions?.showAssignee ?? true;
  const showEstimate = displayOptions?.showEstimate ?? true;
  const showLabels = displayOptions?.showLabels ?? true;

  const labelIds = ticket.labels
    ?.map((l) => l.label?.id)
    .filter((v): v is number => v != null) ?? [];

  const hasProjectId = projectId != null;
  const hasDragHandle = dragHandleProps != null;

  return (
    <motion.div
      className={cn(
        "group flex items-center border-b border-border/50 bg-card last:border-b-0",
        isDragging && "shadow-lg ring-1 ring-primary/20 bg-primary/5 rounded-md",
      )}
      initial={shouldReduceMotion ? false : { opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={pmSnappy}
      whileHover={
        isDragging || shouldReduceMotion
          ? undefined
          : { backgroundColor: "color-mix(in srgb, var(--primary) 4%, transparent)", x: 1 }
      }
    >
      {hasDragHandle && (
        <div
          {...dragHandleProps}
          className="flex-shrink-0 pl-2 pr-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className="flex flex-1 min-w-0 items-center gap-2 px-3 py-1.5">
        {hasProjectId ? (
          <InlineStatus
            ticketId={ticket.id}
            projectId={projectId}
            currentStatus={ticket.status}
            projectStatuses={projectStatuses}
          />
        ) : (
          <div className={cn("h-2 w-2 rounded-full flex-shrink-0", getStatusDotClass(ticket.status))} />
        )}
        {hasProjectId ? (
          <InlineType
            ticketId={ticket.id}
            projectId={projectId}
            currentType={ticket.type}
          />
        ) : (
          <TicketTypeIcon type={ticket.type} size="sm" />
        )}
        {showId && (
          <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
            {formatTicketKey(projectKey, ticket.ticketNumber, ticket.sequenceId ?? undefined)}
          </span>
        )}
        <button
          onClick={handleClick}
          className={cn(
            "flex-1 text-left text-sm text-foreground hover:underline underline-offset-2",
            TEXT_ONE_LINE,
          )}
          title={ticket.title}
        >
          {ticket.title}
        </button>
        {showLabels && hasProjectId && (
          <InlineLabels
            ticketId={ticket.id}
            projectId={projectId}
            currentLabelIds={labelIds}
          />
        )}
        {showPriority && hasProjectId ? (
          <InlinePriority
            ticketId={ticket.id}
            projectId={projectId}
            currentPriority={ticket.priority}
          />
        ) : showPriority && ticket.priority ? (
          <span className="text-xs font-medium flex-shrink-0 text-muted-foreground">{ticket.priority}</span>
        ) : null}
        {showEstimate && hasProjectId ? (
          <InlineEstimate
            ticketId={ticket.id}
            projectId={projectId}
            currentPoints={ticket.points}
          />
        ) : showEstimate && ticket.points != null && ticket.points > 0 ? (
          <Badge variant="outline" className="text-xs flex-shrink-0">{ticket.points}pt</Badge>
        ) : null}
        {hasProjectId && (
          <InlineDueDate
            ticketId={ticket.id}
            projectId={projectId}
            currentDueDate={ticket.dueDate}
          />
        )}
        {showAssignee && hasProjectId ? (
          <InlineAssignee
            ticketId={ticket.id}
            projectId={projectId}
            currentAssigneeId={ticket.assigneeId ?? ticket.assignee?.id}
            assignee={ticket.assignee}
          />
        ) : showAssignee && ticket.assignee ? (
          <Avatar className="h-6 w-6 flex-shrink-0" title={getUserDisplayName(ticket.assignee)}>
            <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
            <AvatarFallback className="text-[8px]">{getUserInitials(ticket.assignee)}</AvatarFallback>
          </Avatar>
        ) : null}
        <button
          onClick={handleClick}
          className="ml-1 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open ticket"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="pr-2 flex-shrink-0">
        <TicketQuickActions
          ticketId={ticket.id}
          projectId={projectId}
          className="opacity-0 translate-x-1 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
        />
      </div>
    </motion.div>
  );
});

interface InlineGroupCreateProps {
  groupKey: string;
  projectId: number;
  status: string;
}

function InlineGroupCreate({ groupKey, projectId, status }: InlineGroupCreateProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const createTicket = useCreateTicket({
    onSuccess: () => { setTitle(""); setOpen(false); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleOpenCreate() { setOpen(true); }
  function handleCancel() { setOpen(false); setTitle(""); }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && title.trim()) {
      createTicket.mutate({ projectId, title: title.trim(), status, type: "TASK" });
    }
    if (e.key === "Escape") handleCancel();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpenCreate}
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
        aria-label={`Add ticket to ${groupKey}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5">
      <Input
        autoFocus
        value={title}
        onChange={handleTitleChange}
        onKeyDown={handleKeyDown}
        placeholder="New ticket title... (Enter to create)"
        className="flex-1 text-xs"
        disabled={createTicket.isPending}
      />
      <button
        type="button"
        onClick={handleCancel}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function getGroupKey(ticket: Ticket, groupBy: string): string {
  switch (groupBy) {
    case "status": return ticket.status ?? "None";
    case "priority": return ticket.priority ?? "None";
    case "assignee": return ticket.assignee ? getUserDisplayName(ticket.assignee) : "Unassigned";
    case "label": {
      const first = ticket.labels?.[0]?.label;
      return first ? first.name : "No label";
    }
    case "cycle": return ticket.cycle?.name ?? "No cycle";
    default: return "All Items";
  }
}

function getGroupStatus(groupBy: string, groupKey: string, tickets: Ticket[]): string {
  if (groupBy === "status") return groupKey;
  return tickets[0]?.status ?? "TODO";
}

function encodeNestedAccordionValue(outerKey: string, innerKey: string): string {
  return `${outerKey}||${innerKey}`;
}

const DROPPABLE_MODES = new Set(["status", "priority", "assignee"]);

type GroupFieldPatch = Pick<UpdateTicketInput, "status" | "priority" | "assigneeId" | "assigneeIds">;

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
type ValidPriority = typeof VALID_PRIORITIES[number];

function isValidPriority(v: string): v is ValidPriority {
  return (VALID_PRIORITIES as readonly string[]).includes(v);
}

function buildGroupFieldPatch(
  groupBy: string,
  newGroupKey: string,
  tickets: Ticket[],
  ticketId: number,
): GroupFieldPatch | null {
  if (groupBy === "status") return { status: newGroupKey };
  if (groupBy === "priority") {
    if (newGroupKey === "None") return { priority: undefined };
    const upper = newGroupKey.toUpperCase();
    if (!isValidPriority(upper)) return null;
    return { priority: upper };
  }
  if (groupBy === "assignee") {
    if (newGroupKey === "Unassigned") return { assigneeIds: [] };
    const match = tickets.find((t) => t.id !== ticketId && getUserDisplayName(t.assignee) === newGroupKey);
    const id = match?.assigneeId ?? match?.assignee?.id;
    if (!id) return null;
    return { assigneeId: id };
  }
  return null;
}

interface OuterGroupHeaderProps {
  groupKey: string;
  rowBy: string;
  tickets: Ticket[];
  count: number;
}

function OuterGroupHeader({ groupKey, rowBy, tickets, count }: OuterGroupHeaderProps) {
  if (rowBy === "assignee") {
    const assigneeTicket = tickets.find((t) => t.assignee != null);
    const assignee = assigneeTicket?.assignee ?? null;
    return (
      <div className="flex items-center gap-2">
        {assignee ? (
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={resolveImageUrl(assignee.image)} />
            <AvatarFallback className="text-[8px]">{getUserInitials(assignee)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-6 w-6 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
        <span className="text-sm font-semibold text-foreground">{groupKey}</span>
        <span className="text-xs text-muted-foreground tabular-nums">({count})</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-foreground">{groupKey}</span>
      <span className="text-xs text-muted-foreground tabular-nums">({count})</span>
    </div>
  );
}

interface NestedGroupProps {
  accordionValue: string;
  groupKey: string;
  outerGroupKey: string;
  items: Ticket[];
  groupBy: string;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  displayOptions?: DisplayOptions;
  onTicketClick: (id: number) => void;
}

function NestedGroup({
  accordionValue,
  groupKey,
  outerGroupKey,
  items,
  groupBy,
  projectKey,
  projectId,
  projectStatuses,
  displayOptions,
  onTicketClick,
}: NestedGroupProps) {
  const status = getGroupStatus(groupBy, groupKey, items);
  return (
    <AccordionItem value={accordionValue} className="mb-3 border-b-0">
      <div className="mb-1.5 flex items-center gap-2 pl-1">
        <AccordionTrigger className="flex flex-1 items-center gap-2 py-0 hover:no-underline font-normal [&>svg]:ml-auto [&>svg]:size-3.5">
          <span className="text-xs font-medium text-muted-foreground">{groupKey}</span>
          <span className="text-xs text-muted-foreground tabular-nums">({items.length})</span>
        </AccordionTrigger>
        {projectId && (
          <InlineGroupCreate
            groupKey={`${outerGroupKey}/${groupKey}`}
            projectId={projectId}
            status={status}
          />
        )}
      </div>
      <AccordionContent className="pb-0">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm divide-y divide-border">
          {items.map((ticket) => (
            <ListViewItem
              key={ticket.id}
              ticket={ticket}
              projectKey={projectKey}
              projectId={projectId}
              projectStatuses={projectStatuses}
              onClick={onTicketClick}
              displayOptions={displayOptions}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

interface DroppableGroupProps {
  groupKey: string;
  items: Ticket[];
  groupBy: string;
  projectKey?: string | null;
  projectId?: number;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
  displayOptions?: DisplayOptions;
  onTicketClick: (id: number) => void;
  shouldReduceMotion: boolean | null;
}

function DroppableGroup({
  groupKey,
  items,
  groupBy,
  projectKey,
  projectId,
  projectStatuses,
  displayOptions,
  onTicketClick,
  shouldReduceMotion,
}: DroppableGroupProps) {
  return (
    <Droppable droppableId={groupKey} type="LIST_TICKET">
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.droppableProps}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  backgroundColor: snapshot.isDraggingOver
                    ? "color-mix(in srgb, var(--primary) 7%, transparent)"
                    : "transparent",
                }
          }
          transition={pmSnappy}
          className={cn(
            "overflow-hidden rounded-lg border border-border bg-card shadow-sm divide-y divide-border min-h-[40px]",
            snapshot.isDraggingOver && "ring-1 ring-inset ring-primary/20",
          )}
        >
          {items.map((ticket, index) => (
            <Draggable key={ticket.id} draggableId={String(ticket.id)} index={index}>
              {(dragProvided, dragSnapshot) => (
                <div
                  ref={dragProvided.innerRef}
                  {...dragProvided.draggableProps}
                  style={dragProvided.draggableProps.style}
                >
                  <ListViewItem
                    ticket={ticket}
                    projectKey={projectKey}
                    projectId={projectId}
                    projectStatuses={projectStatuses}
                    onClick={onTicketClick}
                    displayOptions={displayOptions}
                    dragHandleProps={dragProvided.dragHandleProps}
                    isDragging={dragSnapshot.isDragging}
                  />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
          {items.length === 0 && !snapshot.isDraggingOver && (
            <div className="py-4 text-center text-xs text-muted-foreground">Drop tickets here</div>
          )}
        </motion.div>
      )}
    </Droppable>
  );
}

type ReorderContext = { previousTickets: Ticket[] };

function isReorderContext(v: unknown): v is ReorderContext {
  return typeof v === "object" && v !== null && "previousTickets" in v;
}

export const ListView = memo(function ListView({
  tickets,
  onTicketClick,
  groupBy,
  rowBy,
  projectKey,
  projectId,
  projectStatuses,
  displayOptions,
  showEmptyRows,
}: ListViewProps) {
  const hasRowBy = !!rowBy && rowBy !== "none";
  const shouldReduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const prevTicketsRef = useRef(tickets);
  if (prevTicketsRef.current !== tickets) {
    prevTicketsRef.current = tickets;
    setOptimisticTickets(tickets);
  }

  const isDnDMode = !hasRowBy && !!groupBy && groupBy !== "none" && DROPPABLE_MODES.has(groupBy) && projectId != null;

  const updateTicket = useUpdateTicket(projectId ?? 0);
  const updateOrder = useUpdateTicketOrder({
    onMutate: async (): Promise<ReorderContext> => {
      if (projectId == null) return { previousTickets: optimisticTickets };
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.tickets({ projectId }),
      });
      return { previousTickets: optimisticTickets };
    },
    onError: (error, _vars, context) => {
      if (isReorderContext(context)) setOptimisticTickets(context.previousTickets);
      toast.error(getErrorMessage(error));
    },
    onSettled: () => {
      if (projectId == null) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId }),
      });
    },
  });

  const grouped = useMemo(() => {
    if (!groupBy || groupBy === "none") return { "All Items": optimisticTickets };
    return optimisticTickets.reduce<Record<string, Ticket[]>>((acc, t) => {
      const key = getGroupKey(t, groupBy);
      (acc[key] ??= []).push(t);
      return acc;
    }, {});
  }, [optimisticTickets, groupBy]);

  const nested = useMemo(() => {
    if (!hasRowBy) return null;
    const outerGrouped = optimisticTickets.reduce<Record<string, Ticket[]>>((acc, t) => {
      const key = getGroupKey(t, rowBy ?? "");
      (acc[key] ??= []).push(t);
      return acc;
    }, {});
    const result: Record<string, Record<string, Ticket[]>> = {};
    for (const [outerKey, outerTickets] of Object.entries(outerGrouped)) {
      result[outerKey] = {};
      if (!groupBy || groupBy === "none") {
        result[outerKey]["All Items"] = outerTickets;
      } else {
        for (const t of outerTickets) {
          const innerKey = getGroupKey(t, groupBy);
          (result[outerKey][innerKey] ??= []).push(t);
        }
      }
    }
    return result;
  }, [optimisticTickets, groupBy, rowBy, hasRowBy]);

  const visibleOuterKeys = useMemo(() => {
    if (!nested) return [];
    return Object.entries(nested)
      .filter(([, innerGroups]) => showEmptyRows || Object.values(innerGroups).flat().length > 0)
      .map(([outerKey]) => outerKey);
  }, [nested, showEmptyRows]);

  const flatGroupKeys = useMemo(() => Object.keys(grouped), [grouped]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;
      if (!groupBy || projectId == null) return;

      const ticketId = parseInt(draggableId, 10);
      const srcGroup = source.droppableId;
      const dstGroup = destination.droppableId;
      const isCrossGroup = srcGroup !== dstGroup;

      const allTickets = [...optimisticTickets];

      if (isCrossGroup) {
        const patch = buildGroupFieldPatch(groupBy, dstGroup, allTickets, ticketId);
        if (!patch) return;

        const nextTickets = allTickets.map((t) =>
          t.id === ticketId ? applyLocalPatch(t, patch, groupBy) : t,
        );
        setOptimisticTickets(nextTickets);

        updateTicket.mutate(
          { ticketId, ...patch },
          {
            onError: () => setOptimisticTickets(allTickets),
          },
        );
      } else {
        const groupTickets = (grouped[srcGroup] ?? []).slice();
        const [moved] = groupTickets.splice(source.index, 1);
        if (!moved) return;
        groupTickets.splice(destination.index, 0, moved);

        const reorderedIds = new Set(groupTickets.map((t) => t.id));
        const outsideTickets = allTickets.filter((t) => !reorderedIds.has(t.id));
        const nextTickets = [...outsideTickets];
        groupTickets.forEach((t, idx) => {
          nextTickets.push({ ...t, order: idx });
        });
        setOptimisticTickets(nextTickets);

        const updates = groupTickets.map((t, idx) => ({
          id: t.id,
          status: t.status,
          order: idx,
        }));
        updateOrder.mutate({ projectId, items: updates });
      }
    },
    [groupBy, projectId, optimisticTickets, grouped, updateTicket, updateOrder],
  );

  if (hasRowBy && nested) {
    return (
      <div className="flex flex-col gap-4">
        <Accordion
          type="multiple"
          defaultValue={visibleOuterKeys}
          className="flex flex-col gap-1.5"
        >
          {visibleOuterKeys.map((outerKey) => {
            const innerGroups = nested[outerKey];
            if (!innerGroups) return null;
            const outerTickets = Object.values(innerGroups).flat();
            const innerAccordionValues = Object.keys(innerGroups).map((innerKey) =>
              encodeNestedAccordionValue(outerKey, innerKey),
            );

            return (
              <AccordionItem key={outerKey} value={outerKey} className="border-b-0">
                <AccordionTrigger className="flex items-center gap-2 px-0 py-1 hover:no-underline font-normal [&>svg]:ml-auto">
                  <OuterGroupHeader
                    groupKey={outerKey}
                    rowBy={rowBy ?? ""}
                    tickets={outerTickets}
                    count={outerTickets.length}
                  />
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <div className="space-y-0 border-l border-border pl-3">
                    <Accordion
                      type="multiple"
                      defaultValue={innerAccordionValues}
                      className="flex flex-col"
                    >
                      {Object.entries(innerGroups).map(([innerKey, items]) => (
                        <NestedGroup
                          key={innerKey}
                          accordionValue={encodeNestedAccordionValue(outerKey, innerKey)}
                          groupKey={innerKey}
                          outerGroupKey={outerKey}
                          items={items}
                          groupBy={groupBy ?? "none"}
                          projectKey={projectKey}
                          projectId={projectId}
                          projectStatuses={projectStatuses}
                          displayOptions={displayOptions}
                          onTicketClick={onTicketClick}
                        />
                      ))}
                    </Accordion>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        {tickets.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No work items found</div>
        )}
      </div>
    );
  }

  const hasFlatGrouping = !!groupBy && groupBy !== "none";

  if (isDnDMode) {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-4">
          <Accordion
            type="multiple"
            defaultValue={flatGroupKeys}
            className="flex flex-col gap-1.5"
          >
            {Object.entries(grouped).map(([group, items]) => (
              <AccordionItem key={group} value={group} className="border-b-0">
                <div className="mb-1.5 flex items-center gap-2">
                  <AccordionTrigger className="flex flex-1 items-center gap-2 py-0 hover:no-underline font-normal [&>svg]:ml-auto">
                    <span className="text-sm font-semibold text-foreground">{group}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">({items.length})</span>
                  </AccordionTrigger>
                  {projectId && (
                    <InlineGroupCreate
                      groupKey={group}
                      projectId={projectId}
                      status={getGroupStatus(groupBy ?? "status", group, items)}
                    />
                  )}
                </div>
                <AccordionContent className="pb-0">
                  <DroppableGroup
                    groupKey={group}
                    items={items}
                    groupBy={groupBy ?? "status"}
                    projectKey={projectKey}
                    projectId={projectId}
                    projectStatuses={projectStatuses}
                    displayOptions={displayOptions}
                    onTicketClick={onTicketClick}
                    shouldReduceMotion={shouldReduceMotion}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {optimisticTickets.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No work items found</div>
          )}
        </div>
      </DragDropContext>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hasFlatGrouping ? (
        <Accordion
          type="multiple"
          defaultValue={flatGroupKeys}
          className="flex flex-col gap-1.5"
        >
          {Object.entries(grouped).map(([group, items]) => (
            <AccordionItem key={group} value={group} className="border-b-0">
              <div className="mb-1.5 flex items-center gap-2">
                <AccordionTrigger className="flex flex-1 items-center gap-2 py-0 hover:no-underline font-normal [&>svg]:ml-auto">
                  <span className="text-sm font-semibold text-foreground">{group}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">({items.length})</span>
                </AccordionTrigger>
                {projectId && (
                  <InlineGroupCreate
                    groupKey={group}
                    projectId={projectId}
                    status={getGroupStatus(groupBy ?? "status", group, items)}
                  />
                )}
              </div>
              <AccordionContent className="pb-0">
                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm divide-y divide-border">
                  {items.map((ticket) => (
                    <ListViewItem
                      key={ticket.id}
                      ticket={ticket}
                      projectKey={projectKey}
                      projectId={projectId}
                      projectStatuses={projectStatuses}
                      onClick={onTicketClick}
                      displayOptions={displayOptions}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm divide-y divide-border">
          {optimisticTickets.map((ticket) => (
            <ListViewItem
              key={ticket.id}
              ticket={ticket}
              projectKey={projectKey}
              projectId={projectId}
              projectStatuses={projectStatuses}
              onClick={onTicketClick}
              displayOptions={displayOptions}
            />
          ))}
        </div>
      )}
      {tickets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No work items found</div>
      )}
    </div>
  );
});

function applyLocalPatch(ticket: Ticket, patch: GroupFieldPatch, groupBy: string): Ticket {
  const next = { ...ticket };
  if (groupBy === "status" && patch.status !== undefined) next.status = patch.status;
  if (groupBy === "priority") {
    next.priority = patch.priority ?? null;
  }
  if (groupBy === "assignee") {
    if (patch.assigneeIds !== undefined) {
      next.assigneeId = patch.assigneeIds[0] ?? null;
      next.assignee = null;
    } else if (patch.assigneeId !== undefined) {
      next.assigneeId = patch.assigneeId ?? null;
    }
  }
  return next;
}
