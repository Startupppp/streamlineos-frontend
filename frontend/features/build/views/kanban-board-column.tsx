"use client";

import { memo, type MutableRefObject } from "react";
import {
  Droppable,
  type DraggableProvidedDragHandleProps,
  type DraggableProvidedDraggableProps,
} from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddInput } from "./kanban-quick-add";
import { KanbanColumnHeader } from "./kanban-column-header";
import {
  KanbanVirtualTicketList,
  TICKET_DND_TYPE,
} from "./kanban-virtual-ticket-list";
import type { KanbanTicket, KanbanColumn, DisplayOptions } from "../shared/types";

export { TICKET_DND_TYPE };

export interface KanbanBoardColumnProps {
  column: KanbanColumn;
  tickets: KanbanTicket[];
  projectId: number;
  projectKey?: string;
  droppableId: string;
  canManage: boolean;
  existingNames: string[];
  wipLimit?: number;
  serverCount?: number;
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
  serverCount,
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
        serverCount={serverCount}
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

      {tickets.length === 0 ? (
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
              {!snapshot.isDraggingOver ? (
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
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ) : (
        <div className={cn(stretch ? "min-h-0 flex-1" : "", "flex flex-col")}>
          <KanbanVirtualTicketList
            tickets={tickets}
            projectId={projectId}
            projectKey={projectKey}
            droppableId={droppableId}
            displayOptions={displayOptions}
            stretch={stretch}
            minHeightClass={minHeightClass}
            onSelect={onSelect}
            dragStartRef={dragStartRef}
          />
        </div>
      )}

      {showQuickAdd ? (
        <div className="border-t">
          <QuickAddInput columnId={column.id} projectId={projectId} />
        </div>
      ) : null}
    </div>
  );
});
