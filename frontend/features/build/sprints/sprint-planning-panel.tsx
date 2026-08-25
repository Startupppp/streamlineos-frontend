"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeftRight, AlertTriangle } from "lucide-react";
import { MinusIcon } from "@animateicons/react/lucide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Droppable, DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { LoadingButton } from "@/components/ui/loading-button";
import type { SprintData } from "./sprint-card";
import { PlanningCard } from "./planning-card";
import { useTicketFilters } from "./use-ticket-filters";
import { PlanningBacklogColumn } from "./planning-backlog-column";

import type { PlanningTicket } from "./planning-card";
export type { PlanningTicket };

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
              <span className={cn("font-medium", isOverCapacity && "text-status-danger-ink")}>
                {sprintTotalPoints}pt{sprintCapacity != null ? `/${sprintCapacity}pt` : ""}
              </span>
              {sprintCapacity != null && (
                <span className={cn(isOverCapacity ? "text-status-danger-ink" : "text-muted-foreground")}>
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
              <div className="flex items-center gap-1.5 text-xs text-status-danger-ink bg-status-danger-surface border border-status-danger-rule rounded px-2 py-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Sprint exceeds capacity by {sprintTotalPoints - (sprintCapacity ?? 0)} points
              </div>
            )}
            {sprintUnestimatedCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-status-warning-ink bg-status-warning-surface border border-status-warning-rule rounded px-2 py-1">
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
            <PlanningBacklogColumn
              backlogFilters={backlogFilters}
              totalCount={backlogTickets.length}
              selectedBacklog={selectedBacklog}
              onToggle={handleToggleBacklog}
              onBulkAdd={handleBulkAdd}
              onAdd={handleAddTicket}
              projectKey={projectKey}
              isMutating={isMutating}
            />

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
