"use client";

import { memo } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import type { Deal } from "@/types/crm";
import { DealKanbanCard } from "@/features/crm/deals/deal-kanban-card";

interface KanbanColumnStage {
  key: string;
  label: string;
  dot?: string;
  color?: string;
}

interface KanbanColumnProps {
  stage: KanbanColumnStage;
  deals: Deal[];
  onStageChange: (id: number, stage: string) => void;
  onDelete: (id: number) => void;
  onOpen: (id: number) => void;
}

const KanbanDraggableCard = memo(function KanbanDraggableCard({
  deal,
  index,
  onStageChange,
  onDelete,
  onOpen,
}: {
  deal: Deal;
  index: number;
  onStageChange: (id: number, stage: string) => void;
  onDelete: (id: number) => void;
  onOpen: (id: number) => void;
}) {
  return (
    <Draggable draggableId={String(deal.id)} index={index}>
      {(dragProvided, dragSnapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          className={cn(dragSnapshot.isDragging && "opacity-80 shadow-lg")}
        >
          <DealKanbanCard
            deal={deal}
            onStageChange={onStageChange}
            onDelete={onDelete}
            onOpen={onOpen}
          />
        </div>
      )}
    </Draggable>
  );
});

function formatCompactInr(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export const KanbanColumn = memo(function KanbanColumn({
  stage,
  deals,
  onStageChange,
  onDelete,
  onOpen,
}: KanbanColumnProps) {
  const stageValue = deals.reduce((s, d) => s + Number(d.value || 0), 0);

  return (
    <div className="w-56 sm:w-64 md:w-72 flex-shrink-0">
      <div className="mb-3 px-1">
        <div className="flex items-center gap-2">
          {stage.color ? (
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: stage.color }}
            />
          ) : (
            <div className={cn("w-2.5 h-2.5 rounded-full", stage.dot)} />
          )}
          <span className="text-sm font-semibold">{stage.label}</span>
          {stageValue > 0 && (
            <span className="ml-auto text-xs text-muted-foreground font-medium">
              {formatCompactInr(stageValue)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 pl-[18px]">
          {deals.length} {deals.length === 1 ? "deal" : "deals"}
        </p>
      </div>
      <Droppable droppableId={stage.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "space-y-2 min-h-[200px] p-2 rounded-lg border border-border/50 transition-colors",
              snapshot.isDraggingOver ? "bg-muted/60 border-primary/40" : "bg-muted/30",
            )}
          >
            {deals.map((deal, index) => (
              <KanbanDraggableCard
                key={deal.id}
                deal={deal}
                index={index}
                onStageChange={onStageChange}
                onDelete={onDelete}
                onOpen={onOpen}
              />
            ))}
            {provided.placeholder}
            {deals.length === 0 && !snapshot.isDraggingOver && (
              <div className="text-center py-8 text-xs text-muted-foreground">No deals</div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
});
