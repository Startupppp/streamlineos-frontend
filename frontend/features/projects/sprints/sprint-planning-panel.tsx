"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeftRight, CheckSquare, AlertTriangle, PackageOpen } from "lucide-react";
import { PlusIcon, MinusIcon, XIcon } from "@animateicons/react/lucide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { SearchInput } from "@/components/ui/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { LoadingButton } from "@/components/ui/loading-button";
import { PriorityBadge } from "@/features/projects/shared/priority-badge";
import { StatusBadge } from "@/features/projects/shared/status-badge";
import { TicketTypeIcon } from "@/features/projects/shared/ticket-type-icon";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { formatTicketKey } from "@/features/projects/shared/format-ticket-key";
import { resolveImageUrl } from "@/lib/utils";
import type { SprintData } from "./sprint-card";

interface PlanningTicketUser {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface PlanningTicket {
  id: number;
  title?: string;
  status: string | null;
  points: number | null;
  sprintId?: number | null;
  type?: string | null;
  priority?: string | null;
  ticketNumber?: number | null;
  assignee?: PlanningTicketUser | null;
  assigneeId?: string | null;
}

interface SprintPlanningPanelProps {
  sprint: SprintData;
  backlogTickets: PlanningTicket[];
  projectKey?: string | null;
  onDragEnd: (result: DropResult) => void;
  onAddTicket: (ticketId: number) => void;
  onRemoveTicket: (ticketId: number) => void;
  onBulkAdd: (ticketIds: number[]) => void;
  onBulkRemove: (ticketIds: number[]) => void;
  onDone: () => void;
  isMutating?: boolean;
  sprintCapacity?: number | null;
}

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const TYPE_OPTIONS = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"] as const;
const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

function useTicketFilters(tickets: PlanningTicket[]) {
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("__all__");
  const [filterType, setFilterType] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterAssignee, setFilterAssignee] = useState("__all__");

  const assigneeOptions = useMemo(() => {
    const seen = new Map<string, PlanningTicketUser & { id: string }>();
    for (const t of tickets) {
      if (t.assigneeId && t.assignee) {
        seen.set(t.assigneeId, { ...t.assignee, id: t.assigneeId });
      }
    }
    return Array.from(seen.values());
  }, [tickets]);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return tickets.filter((t) => {
      if (lower) {
        const titleMatch = (t.title ?? "").toLowerCase().includes(lower);
        const keyMatch = t.ticketNumber != null && String(t.ticketNumber).includes(lower);
        if (!titleMatch && !keyMatch) return false;
      }
      if (filterPriority !== "__all__" && t.priority !== filterPriority) return false;
      if (filterType !== "__all__" && t.type !== filterType) return false;
      if (filterStatus !== "__all__" && t.status !== filterStatus) return false;
      if (filterAssignee !== "__all__") {
        if (filterAssignee === "__unassigned__" && t.assigneeId) return false;
        if (filterAssignee !== "__unassigned__" && t.assigneeId !== filterAssignee) return false;
      }
      return true;
    });
  }, [tickets, search, filterPriority, filterType, filterStatus, filterAssignee]);

  const hasActiveFilters =
    search !== "" ||
    filterPriority !== "__all__" ||
    filterType !== "__all__" ||
    filterStatus !== "__all__" ||
    filterAssignee !== "__all__";

  function clearFilters() {
    setSearch("");
    setFilterPriority("__all__");
    setFilterType("__all__");
    setFilterStatus("__all__");
    setFilterAssignee("__all__");
  }

  return {
    search, setSearch,
    filterPriority, setFilterPriority,
    filterType, setFilterType,
    filterStatus, setFilterStatus,
    filterAssignee, setFilterAssignee,
    filtered,
    hasActiveFilters,
    clearFilters,
    assigneeOptions,
  };
}

interface PlanningCardProps {
  ticket: PlanningTicket;
  index: number;
  projectKey?: string | null;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  actionIcon: "plus" | "minus";
  onAction: (id: number) => void;
  isPending?: boolean;
}

const PlanningCard = function PlanningCard({
  ticket,
  index,
  projectKey,
  isSelected,
  onToggleSelect,
  actionIcon,
  onAction,
  isPending,
}: PlanningCardProps) {
  const handleToggle = useCallback(() => onToggleSelect(ticket.id), [ticket.id, onToggleSelect]);
  const handleAction = useCallback(() => onAction(ticket.id), [ticket.id, onAction]);
  const ticketKey = formatTicketKey(projectKey, ticket.ticketNumber, ticket.id);
  const assigneeName = getUserDisplayName(ticket.assignee ?? null);
  const assigneeInitials = getUserInitials(ticket.assignee ?? null);
  const showDoneWarning = ticket.status === "DONE" || ticket.status === "CANCELLED";

  return (
    <Draggable draggableId={ticket.id.toString()} index={index}>
      {(dragProvided, dragSnapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          className={cn(
            "p-2 bg-card rounded border text-xs group",
            "flex items-start gap-2 min-w-0",
            dragSnapshot.isDragging && "shadow-md opacity-90",
            isSelected && "border-primary/60 bg-primary/5",
          )}
        >
          <button
            type="button"
            onClick={handleToggle}
            aria-pressed={isSelected}
            aria-label={isSelected ? "Deselect ticket" : "Select ticket"}
            className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0 rounded border transition-colors flex items-center justify-center",
              isSelected ? "bg-primary border-primary" : "border-border hover:border-primary/60",
            )}
          >
            {isSelected && <CheckSquare className="h-3 w-3 text-primary-foreground" aria-hidden />}
          </button>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1 min-w-0">
              {ticket.type && <TicketTypeIcon type={ticket.type} size="sm" />}
              <span className="font-mono text-[10px] text-muted-foreground shrink-0">{ticketKey}</span>
              <span className="truncate font-medium">{ticket.title}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ticket.status && <StatusBadge status={ticket.status} />}
              {ticket.priority && <PriorityBadge priority={ticket.priority} />}
              {ticket.points != null && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{ticket.points}pt</Badge>
              )}
              {ticket.assignee ? (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
                        <AvatarFallback className="text-[8px]">{assigneeInitials}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">{assigneeName}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className="text-[10px] text-muted-foreground">Unassigned</span>
              )}
              {showDoneWarning && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" aria-label="Closed ticket" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Ticket is already {ticket.status?.toLowerCase()}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <AnimatedIconButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  icon={actionIcon === "plus" ? PlusIcon : MinusIcon}
                  iconSize={14}
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  onClick={handleAction}
                  disabled={isPending}
                  aria-label={actionIcon === "plus" ? "Add to sprint" : "Remove from sprint"}
                />
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {actionIcon === "plus" ? "Add to sprint" : "Remove from sprint"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </Draggable>
  );
};

export function SprintPlanningPanel({
  sprint,
  backlogTickets,
  projectKey,
  onDragEnd,
  onAddTicket,
  onRemoveTicket,
  onBulkAdd,
  onBulkRemove,
  onDone,
  isMutating,
  sprintCapacity,
}: SprintPlanningPanelProps) {
  const [selectedBacklog, setSelectedBacklog] = useState<Set<number>>(new Set());
  const [selectedSprint, setSelectedSprint] = useState<Set<number>>(new Set());

  const sprintTickets: PlanningTicket[] = useMemo(
    () =>
      (sprint.tickets ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        points: t.points,
        sprintId: sprint.id,
        type: t.type ?? null,
        priority: t.priority ?? null,
        ticketNumber: t.ticketNumber ?? null,
        assigneeId: t.assigneeId ?? null,
        assignee: t.assignee ?? null,
      })),
    [sprint.tickets, sprint.id],
  );

  const backlogFilters = useTicketFilters(backlogTickets);

  const sprintTotalPoints = useMemo(
    () => (sprint.tickets ?? []).reduce((sum, t) => sum + (t.points ?? 0), 0),
    [sprint.tickets],
  );

  const sprintUnestimatedCount = useMemo(
    () => (sprint.tickets ?? []).filter((t) => t.points == null || t.points === 0).length,
    [sprint.tickets],
  );

  const isOverCapacity = sprintCapacity != null && sprintTotalPoints > sprintCapacity;
  const remainingCapacity = sprintCapacity != null ? sprintCapacity - sprintTotalPoints : null;

  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);

  const handleToggleBacklog = useCallback((id: number) => {
    setSelectedBacklog((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSprint = useCallback((id: number) => {
    setSelectedSprint((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBulkAdd = useCallback(() => {
    if (selectedBacklog.size === 0) return;
    onBulkAdd(Array.from(selectedBacklog));
    setSelectedBacklog(new Set());
  }, [selectedBacklog, onBulkAdd]);

  const handleBulkRemove = useCallback(() => {
    if (selectedSprint.size === 0) return;
    onBulkRemove(Array.from(selectedSprint));
    setSelectedSprint(new Set());
  }, [selectedSprint, onBulkRemove]);

  const handleAddTicket = useCallback(
    (id: number) => {
      onAddTicket(id);
      setSelectedBacklog((prev) => { const n = new Set(prev); n.delete(id); return n; });
    },
    [onAddTicket],
  );

  const handleRemoveTicket = useCallback(
    (id: number) => {
      onRemoveTicket(id);
      setSelectedSprint((prev) => { const n = new Set(prev); n.delete(id); return n; });
    },
    [onRemoveTicket],
  );

  return (
    <Card className="border-primary/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Planning: {sprint.name}
          </CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {format(startDate, "MMM d")} — {format(endDate, "MMM d, yyyy")}
              </span>
              <span>{(sprint.tickets ?? []).length} tickets</span>
              <span className={cn("font-medium", isOverCapacity && "text-red-500")}>
                {sprintTotalPoints}pt{sprintCapacity != null ? `/${sprintCapacity}pt` : ""}
              </span>
              {sprintCapacity != null && (
                <span className={cn(isOverCapacity ? "text-red-500" : "text-muted-foreground")}>
                  {isOverCapacity
                    ? `${sprintTotalPoints - sprintCapacity}pt over capacity`
                    : `${remainingCapacity}pt remaining`}
                </span>
              )}
            </div>
            <LoadingButton
              variant="default"
              size="sm"
              onClick={onDone}
              isPending={isMutating ?? false}
              loadingText="Saving…"
            >
              Save Planning
            </LoadingButton>
          </div>
        </div>

        {(isOverCapacity || sprintUnestimatedCount > 0) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {isOverCapacity && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/30">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Sprint exceeds capacity by {sprintTotalPoints - (sprintCapacity ?? 0)} points
              </div>
            )}
            {sprintUnestimatedCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {sprintUnestimatedCount} ticket{sprintUnestimatedCount !== 1 ? "s" : ""} without an estimate
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">
                  Backlog ({backlogFilters.filtered.length}{backlogFilters.hasActiveFilters ? ` / ${backlogTickets.length}` : ""})
                </h4>
                {selectedBacklog.size > 0 && (
                  <AnimatedIconButton
                    type="button"
                    variant="default"
                    size="sm"
                    icon={PlusIcon}
                    iconSize={14}
                    iconClassName="mr-0"
                    onClick={handleBulkAdd}
                    disabled={isMutating}
                    className="text-xs gap-1"
                    aria-label={`Add ${selectedBacklog.size} selected tickets to sprint`}
                  >
                    Add {selectedBacklog.size} selected
                  </AnimatedIconButton>
                )}
              </div>

                <div className="space-y-1.5">
                <SearchInput
                  value={backlogFilters.search}
                  onValueChange={backlogFilters.setSearch}
                  placeholder="Search title or ID…"
                  aria-label="Search backlog tickets"
                />

                <div className="flex gap-1.5 flex-wrap">
                  <Select value={backlogFilters.filterPriority} onValueChange={backlogFilters.setFilterPriority}>
                    <SelectTrigger className="text-xs w-[90px]" aria-label="Filter by priority">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All priorities</SelectItem>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={backlogFilters.filterType} onValueChange={backlogFilters.setFilterType}>
                    <SelectTrigger className="text-xs w-[80px]" aria-label="Filter by type">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All types</SelectItem>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={backlogFilters.filterStatus} onValueChange={backlogFilters.setFilterStatus}>
                    <SelectTrigger className="text-xs w-[80px]" aria-label="Filter by status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All statuses</SelectItem>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace("_", " ").charAt(0) + s.replace("_", " ").slice(1).toLowerCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {backlogFilters.assigneeOptions.length > 0 && (
                    <Select value={backlogFilters.filterAssignee} onValueChange={backlogFilters.setFilterAssignee}>
                      <SelectTrigger className="text-xs w-[90px]" aria-label="Filter by assignee">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All assignees</SelectItem>
                        <SelectItem value="__unassigned__">Unassigned</SelectItem>
                        {backlogFilters.assigneeOptions.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{getUserDisplayName(u)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {backlogFilters.hasActiveFilters && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 px-2"
                      onClick={backlogFilters.clearFilters}
                      aria-label="Clear all filters"
                    >
                      <XIcon size={12} />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <Droppable droppableId="backlog">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    aria-label="Backlog tickets"
                    className={cn(
                      "min-h-[200px] rounded-lg border border-dashed p-2 space-y-1",
                      snapshot.isDraggingOver && "bg-primary/5 border-primary/30",
                    )}
                  >
                    {backlogFilters.filtered.map((ticket, index) => (
                      <PlanningCard
                        key={ticket.id}
                        ticket={ticket}
                        index={index}
                        projectKey={projectKey}
                        isSelected={selectedBacklog.has(ticket.id)}
                        onToggleSelect={handleToggleBacklog}
                        actionIcon="plus"
                        onAction={handleAddTicket}
                        isPending={isMutating}
                      />
                    ))}
                    {provided.placeholder}
                    {backlogFilters.filtered.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                        <PackageOpen className="w-8 opacity-40" aria-hidden />
                        <p className="text-xs text-center">
                          {backlogFilters.hasActiveFilters
                            ? "No tickets match the active filters"
                            : "No backlog tickets"}
                        </p>
                        {backlogFilters.hasActiveFilters && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="text-xs h-auto p-0"
                            onClick={backlogFilters.clearFilters}
                          >
                            Clear filters
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">
                  {sprint.name} ({sprintTickets.length})
                </h4>
                {selectedSprint.size > 0 && (
                  <AnimatedIconButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={MinusIcon}
                    iconSize={14}
                    iconClassName="mr-0"
                    onClick={handleBulkRemove}
                    disabled={isMutating}
                    className="text-xs gap-1"
                    aria-label={`Remove ${selectedSprint.size} selected tickets from sprint`}
                  >
                    Remove {selectedSprint.size} selected
                  </AnimatedIconButton>
                )}
              </div>

              <Droppable droppableId={sprint.id.toString()}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    aria-label={`${sprint.name} tickets`}
                    className={cn(
                      "min-h-[200px] rounded-lg border border-dashed p-2 space-y-1",
                      snapshot.isDraggingOver && "bg-primary/5 border-primary/30",
                    )}
                  >
                    {sprintTickets.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex flex-col items-center justify-center min-h-[180px] gap-2 text-muted-foreground">
                        <ArrowLeftRight className="w-8 opacity-30" aria-hidden />
                        <p className="text-xs text-center px-4">
                          Drag tickets here or select tickets from backlog
                        </p>
                      </div>
                    )}
                    {sprintTickets.map((ticket, index) => (
                      <PlanningCard
                        key={ticket.id}
                        ticket={ticket}
                        index={index}
                        projectKey={projectKey}
                        isSelected={selectedSprint.has(ticket.id)}
                        onToggleSelect={handleToggleSprint}
                        actionIcon="minus"
                        onAction={handleRemoveTicket}
                        isPending={isMutating}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}
