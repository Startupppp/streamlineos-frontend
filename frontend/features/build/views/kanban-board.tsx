"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { AddColumn } from "./kanban-add-column";
import { KanbanBoardColumn } from "./kanban-board-column";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SwimlaneRowHeader } from "./kanban-swimlane";
import type { KanbanTicket, DisplayOptions } from "../shared/types";
import type { ListSelection } from "./list-view-shared";
import { isCompletedTicketStatus } from "../shared/completed-status";
import {
  type StatusEntry,
  columnDraggableId,
  encodeRowKey,
  BOARD_COLUMN_VIRTUALIZATION_THRESHOLD,
} from "./kanban-board-utils";
import { useKanbanBoard } from "./use-kanban-board";
import type { BoardFilters } from "@/hooks/api/build/ticket-queries";

interface KanbanBoardProps {
  tickets: KanbanTicket[];
  projectId: number;
  projectKey?: string;
  statuses?: StatusEntry[];
  onTicketSelect?: (ticketId: number) => void;
  wipLimits?: Record<string, number>;
  displayOptions?: DisplayOptions;
  hideCompleted?: boolean;
  hasActiveFilters?: boolean;
  filters?: BoardFilters;
  selection?: ListSelection;
  readOnly?: boolean;
}

export function KanbanBoard({
  tickets,
  projectId,
  projectKey,
  statuses,
  onTicketSelect,
  wipLimits,
  displayOptions,
  hideCompleted = false,
  hasActiveFilters = false,
  filters,
  selection,
  readOnly = false,
}: KanbanBoardProps) {
  const {
    canManage,
    canUpdateTickets,
    columnCountsData,
    isMounted,
    optimisticStatuses,
    dragStartRef,
    rowBy,
    swimlaneGroups,
    visibleSwimlaneRows,
    ticketsByStatus,
    visibleColumns,
    existingNames,
    handleSelect,
    handleColumnRename,
    handleColumnColorChange,
    onDragStart,
    onDragEnd,
  } = useKanbanBoard({
    tickets,
    projectId,
    statuses,
    onTicketSelect,
    displayOptions,
    hideCompleted,
    filters,
  });
  const boardCanManage = !readOnly && canManage;
  const boardCanUpdateTickets = !readOnly && canUpdateTickets;

  if (!isMounted) return null;

  if (rowBy !== "none") {
    return (
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <Accordion
          type="multiple"
          defaultValue={visibleSwimlaneRows}
          className="flex h-full min-w-0 flex-col gap-1.5 overflow-y-auto pb-1 px-1 scrollbar-hide"
        >
          {swimlaneGroups.map(({ rowKey, tickets: rowTickets, byStatus: rowByStatus }) => {
            return (
              <AccordionItem
                key={rowKey}
                value={rowKey}
                className="min-w-0 border-b-0"
              >
                <AccordionTrigger className="flex items-center gap-2 px-1 py-1 font-normal hover:no-underline [&>svg]:ml-auto">
                  <div className="flex items-center gap-2">
                    <SwimlaneRowHeader
                      rowKey={rowKey}
                      rowBy={rowBy}
                      tickets={rowTickets}
                      count={rowTickets.length}
                    />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <div className="kanban-scroll-container flex h-[min(480px,calc(100dvh-12rem))] max-h-[min(480px,calc(100dvh-12rem))] min-w-0 w-full max-w-full items-stretch gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x pb-2 pt-0.5 [scrollbar-width:thin] md:scrollbar-hide">
                    {visibleColumns.map((col) => (
                      <KanbanBoardColumn
                        hasActiveFilters={hasActiveFilters}
                        completedTicketsHidden={
                          hideCompleted && isCompletedTicketStatus(col.id, optimisticStatuses)
                        }
                        key={col.id}
                        column={col}
                        tickets={rowByStatus.get(col.id) ?? []}
                        projectId={projectId}
                        projectKey={projectKey}
                        droppableId={`${encodeRowKey(rowKey)}||${col.id}`}
                        canManage={boardCanManage}
                        existingNames={existingNames}
                        wipLimit={wipLimits?.[col.id]}
                        serverCount={columnCountsData ? (columnCountsData[col.id] ?? 0) : undefined}
                        displayOptions={displayOptions}
                        minHeightClass="min-h-[60px]"
                        stretch
                        onRename={handleColumnRename}
                        onColorChange={handleColumnColorChange}
                        onSelect={handleSelect}
                        selection={selection}
                        dragStartRef={dragStartRef}
                        canDragTickets={boardCanUpdateTickets}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </DragDropContext>
    );
  }

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <Droppable
        droppableId="board-columns"
        direction="horizontal"
        type="COLUMN"
      >
        {(columnsProvided) => (
          <div
            ref={columnsProvided.innerRef}
            {...columnsProvided.droppableProps}
            className={cn(
              "kanban-scroll-container flex h-full min-w-0 w-full max-w-full items-start gap-3 overflow-x-auto overscroll-x-contain touch-pan-x pb-1 px-1 [scrollbar-width:thin] md:scrollbar-hide",
              visibleColumns.length > BOARD_COLUMN_VIRTUALIZATION_THRESHOLD && "[&>*]:content-visibility-auto",
            )}
          >
            {visibleColumns.map((col, index) => {
              const columnTickets = ticketsByStatus.get(col.id) ?? [];
              const canReorderColumn = boardCanManage && col.statusId != null;

              return (
                <Draggable
                  key={col.id}
                  draggableId={columnDraggableId(col)}
                  index={index}
                  isDragDisabled={!canReorderColumn}
                >
                  {(columnProvided, columnSnapshot) => (
                    <KanbanBoardColumn
                      hasActiveFilters={hasActiveFilters}
                      completedTicketsHidden={
                        hideCompleted && isCompletedTicketStatus(col.id, optimisticStatuses)
                      }
                      column={col}
                      tickets={columnTickets}
                      projectId={projectId}
                      projectKey={projectKey}
                      droppableId={col.id}
                      canManage={boardCanManage}
                      existingNames={existingNames}
                      wipLimit={wipLimits?.[col.id]}
                      serverCount={columnCountsData ? (columnCountsData[col.id] ?? 0) : undefined}
                      displayOptions={displayOptions}
                      showHeaderQuickAdd={!readOnly}
                      dragHandleProps={
                        canReorderColumn ? columnProvided.dragHandleProps : null
                      }
                      isColumnDragging={columnSnapshot.isDragging}
                      onRename={handleColumnRename}
                      onColorChange={handleColumnColorChange}
                      onSelect={handleSelect}
                        selection={selection}
                      dragStartRef={dragStartRef}
                      canDragTickets={boardCanUpdateTickets}
                      columnInnerRef={columnProvided.innerRef}
                      columnDraggableProps={columnProvided.draggableProps}
                    />
                  )}
                </Draggable>
              );
            })}
            {columnsProvided.placeholder}
            {!readOnly ? (
              <AddColumn projectId={projectId} existingNames={existingNames} />
            ) : null}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
