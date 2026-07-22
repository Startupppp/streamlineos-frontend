"use client";

import { memo, type MutableRefObject } from "react";
import {
  Droppable,
  Draggable,
  type DraggableProvidedDragHandleProps,
  type DraggableProvidedDraggableProps,
} from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanTicketCard } from "./kanban-ticket-card";
import { QuickAddInput } from "./kanban-quick-add";
import { KanbanColumnHeader } from "./kanban-column-header";
import type { KanbanTicket, KanbanColumn, DisplayOptions } from "../shared/types";

export const TICKET_DND_TYPE = "TICKET";

interface KanbanTicketDraggableProps {
  ticket: KanbanTicket;
  index: number;
  projectId: number;
  projectKey?: string;
  dragStartRef: MutableRefObject<{ x: number; y: number } | null>;
  onSelect: (id: number) => void;
  displayOptions?: DisplayOptions;
}

const KanbanTicketDraggable = memo(function KanbanTicketDraggable({
  ticket,
  index,
  projectId,
  projectKey,
  dragStartRef,
  onSelect,
  displayOptions,
}: KanbanTicketDraggableProps) {
  return (
    <Draggable draggableId={String(ticket.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className={cn(snapshot.isDragging && "z-20")}
        >
          <KanbanTicketCard
            ticket={ticket}
            projectId={projectId}
            projectKey={projectKey}
            isDragging={snapshot.isDragging}
            dragStartRef={dragStartRef}
            onSelect={onSelect}
            displayOptions={displayOptions}
          />
        </div>
      )}
    </Draggable>
  );
});

export interface KanbanBoardColumnProps {
  column: KanbanColumn;
  tickets: KanbanTicket[];
  projectId: number;
  projectKey?: string;
  droppableId: string;
  canManage: boolean;
  existingNames: string[];
  wipLimit?: number;
  displayOptions?: DisplayOptions;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isColumnDragging?: boolean;
  showQuickAdd?: boolean;
  showHeaderQuickAdd?: boolean;
  stretch?: boolean;
  minHeightClass?: string;
  onRename: (oldName: string, newName: string) => void;
  onColorChange: (statusId: number, color: string) => void;
  onSelect: (id: number) => void;
  dragStartRef: MutableRefObject<{ x: number; y: number } | null>;
  columnInnerRef?: (element?: HTMLElement | null) => void;
  columnDraggableProps?: DraggableProvidedDraggableProps;
}

export const KanbanBoardColumn = memo(function KanbanBoardColumn({
  column,
  tickets,
  projectId,
  projectKey,
  droppableId,
  canManage,
  existingNames,
  wipLimit,
  displayOptions,
  dragHandleProps,
  isColumnDragging = false,
  showQuickAdd = false,
  showHeaderQuickAdd = false,
  stretch = true,
  minHeightClass = "min-h-[100px]",
  onRename,
  onColorChange,
  onSelect,
  dragStartRef,
  columnInnerRef,
  columnDraggableProps,
}: KanbanBoardColumnProps) {
  const overWip = wipLimit != null && wipLimit > 0 && tickets.length > wipLimit;

  return (
    <div
      ref={columnInnerRef}
      {...columnDraggableProps}
      className={cn(
        "flex w-72 min-w-[280px] shrink-0 flex-col self-stretch rounded-lg border bg-muted/20 min-h-0",
        overWip && "border-destructive/60",
        isColumnDragging && "opacity-95 shadow-lg ring-2 ring-primary/20",
      )}
    >
      <KanbanColumnHeader
        column={column}
        projectId={projectId}
        ticketCount={tickets.length}
        canManage={canManage}
        existingNames={existingNames}
        onRename={onRename}
        onColorChange={onColorChange}
        quickAdd={
          showHeaderQuickAdd ? (
            <QuickAddInput columnId={column.id} projectId={projectId} headerMode />
          ) : undefined
        }
        dragHandleProps={dragHandleProps}
      />
      <Droppable droppableId={droppableId} type={TICKET_DND_TYPE}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              stretch ? "min-h-0 flex-1" : "",
              "space-y-1.5 overflow-y-auto rounded-b-lg px-2 pb-2 scrollbar-hide",
              minHeightClass,
              "transition-[background-color,box-shadow] duration-150 ease-out",
              snapshot.isDraggingOver && "bg-primary/[0.07] ring-1 ring-inset ring-primary/15",
            )}
          >
            {tickets.length === 0 && !snapshot.isDraggingOver ? (
              <div
                className={cn(
                  "flex flex-col items-center justify-center text-center",
                  minHeightClass === "min-h-[60px]" ? "py-6" : "py-8",
                )}
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                  <Plus className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground">Drop tickets here</p>
              </div>
            ) : null}
            {tickets.map((ticket, index) => (
              <KanbanTicketDraggable
                key={ticket.id}
                ticket={ticket}
                index={index}
                projectId={projectId}
                projectKey={projectKey}
                dragStartRef={dragStartRef}
                onSelect={onSelect}
                displayOptions={displayOptions}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      {showQuickAdd ? (
        <div className="border-t">
          <QuickAddInput columnId={column.id} projectId={projectId} />
        </div>
      ) : null}
    </div>
  );
});
