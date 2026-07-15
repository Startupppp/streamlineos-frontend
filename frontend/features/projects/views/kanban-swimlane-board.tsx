"use client";

import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { KanbanColumnHeader } from "./kanban-column-header";
import { KanbanColumnTickets } from "./kanban-column-tickets";
import { SwimlaneRowHeader, getTicketRowKey } from "./kanban-swimlane";
import type { KanbanTicket, KanbanColumn, DisplayOptions } from "../shared/types";

function encodeRowKey(key: string): string {
  return key.replace(/\|/g, "__PIPE__");
}

interface KanbanSwimlaneBoardProps {
  visibleSwimlaneRows: string[];
  displayTickets: KanbanTicket[];
  visibleColumns: KanbanColumn[];
  rowBy: string;
  wipLimits?: Record<string, number>;
  projectId: number;
  projectKey?: string;
  canManage: boolean;
  optimisticStatuses?: Array<{
    id: number;
    name: string;
    color: string | null;
    order: number;
    wipLimit?: number | null;
    type?: string | null;
  }>;
  displayOptions?: DisplayOptions;
  shouldReduceMotion: boolean | null;
  dragStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  handleSelect: (id: number) => void;
  handleColumnRename: (oldName: string, newName: string) => void;
  handleColumnColorChange: (statusId: number, color: string) => void;
  onDragStart: () => void;
  onDragEnd: (result: DropResult) => void;
}

export function KanbanSwimlaneBoard({
  visibleSwimlaneRows,
  displayTickets,
  visibleColumns,
  rowBy,
  wipLimits,
  projectId,
  projectKey,
  canManage,
  optimisticStatuses,
  displayOptions,
  shouldReduceMotion,
  dragStartRef,
  handleSelect,
  handleColumnRename,
  handleColumnColorChange,
  onDragStart,
  onDragEnd,
}: KanbanSwimlaneBoardProps) {
  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <Accordion
        type="multiple"
        defaultValue={visibleSwimlaneRows}
        className="flex flex-col gap-1.5 h-full min-w-0 overflow-auto pb-1 px-1"
      >
        {visibleSwimlaneRows.map((rowKey) => {
          const rowTickets = displayTickets.filter(
            (t) => getTicketRowKey(t, rowBy) === rowKey,
          );

          return (
            <AccordionItem key={rowKey} value={rowKey} className="min-w-0 border-b-0">
              <AccordionTrigger className="flex items-center gap-2 px-1 py-1 hover:no-underline font-normal [&>svg]:ml-auto">
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
                <div className="flex items-start gap-3 overflow-x-auto pb-2 pt-0.5">
                  {visibleColumns.map((col) => {
                    const droppableId = `${encodeRowKey(rowKey)}||${col.id}`;
                    const columnTickets = rowTickets
                      .filter((t) => t.status === col.id)
                      .sort((a, b) => (a.order || 0) - (b.order || 0));
                    const wip = wipLimits?.[col.id];
                    const overWip = wip != null && columnTickets.length > wip;

                    return (
                      <div
                        key={col.id}
                        className={cn(
                          "w-72 min-w-[280px] shrink-0 rounded-lg border bg-muted/20 flex flex-col",
                          overWip && "border-destructive/60",
                        )}
                      >
                        <KanbanColumnHeader
                          column={col}
                          projectId={projectId}
                          ticketCount={columnTickets.length}
                          wipLimit={wip}
                          canManage={canManage}
                          existingNames={(optimisticStatuses ?? []).map((s) => s.name)}
                          onRename={handleColumnRename}
                          onColorChange={handleColumnColorChange}
                        />
                        <KanbanColumnTickets
                          col={col}
                          columnTickets={columnTickets}
                          droppableId={droppableId}
                          minHeight="min-h-[60px]"
                          stretchColumn={false}
                          projectId={projectId}
                          projectKey={projectKey}
                          handleSelect={handleSelect}
                          optimisticStatuses={optimisticStatuses}
                          displayOptions={displayOptions}
                          shouldReduceMotion={shouldReduceMotion}
                          dragStartRef={dragStartRef}
                        />
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </DragDropContext>
  );
}
