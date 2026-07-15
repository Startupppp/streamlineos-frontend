"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { AnimatePresence, motion } from "framer-motion";
import { KanbanTicketCard } from "./kanban-ticket-card";
import { pmSnappy } from "@/features/projects/shared/pm-motion";
import type { KanbanTicket, KanbanColumn, DisplayOptions } from "../shared/types";

const TICKET_DND_TYPE = "TICKET";

interface KanbanColumnTicketsProps {
  col: KanbanColumn;
  columnTickets: KanbanTicket[];
  droppableId: string;
  minHeight: string;
  stretchColumn: boolean;
  projectId: number;
  projectKey?: string;
  handleSelect: (id: number) => void;
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
}

export function KanbanColumnTickets({
  col: _col,
  columnTickets,
  droppableId,
  minHeight,
  stretchColumn,
  projectId,
  projectKey,
  handleSelect,
  optimisticStatuses,
  displayOptions,
  shouldReduceMotion,
  dragStartRef,
}: KanbanColumnTicketsProps) {
  return (
    <Droppable droppableId={droppableId} type={TICKET_DND_TYPE}>
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
                  scale: snapshot.isDraggingOver ? 1.01 : 1,
                }
          }
          transition={pmSnappy}
          className={cn(
            stretchColumn ? "min-h-0 flex-1" : "",
            "overflow-y-auto scrollbar-thin px-2 pb-2 space-y-1.5 rounded-b-lg",
            minHeight,
            snapshot.isDraggingOver && "ring-1 ring-inset ring-primary/15",
          )}
        >
          <AnimatePresence mode="popLayout">
            {columnTickets.length === 0 && !snapshot.isDraggingOver && (
              <motion.div
                key="empty"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "flex flex-col items-center justify-center text-center",
                  minHeight === "min-h-[60px]" ? "py-6" : "py-8",
                )}
              >
                <motion.div
                  className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { y: [0, -2, 0] }
                  }
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Plus className="h-4 w-4 text-muted-foreground/50" />
                </motion.div>
                <p className="text-[11px] text-muted-foreground">Drop tickets here</p>
              </motion.div>
            )}
            {columnTickets.map((ticket, index) => (
              <Draggable key={ticket.id} draggableId={ticket.id.toString()} index={index}>
                {(draggableProvided, draggableSnapshot) => (
                  <div
                    ref={draggableProvided.innerRef}
                    {...draggableProvided.draggableProps}
                    {...draggableProvided.dragHandleProps}
                    style={{ ...draggableProvided.draggableProps.style }}
                  >
                    <KanbanTicketCard
                      ticket={ticket}
                      projectId={projectId}
                      projectKey={projectKey}
                      isDragging={draggableSnapshot.isDragging}
                      dragStartRef={dragStartRef}
                      onSelect={handleSelect}
                      projectStatuses={optimisticStatuses}
                      displayOptions={displayOptions}
                      index={index}
                    />
                  </div>
                )}
              </Draggable>
            ))}
          </AnimatePresence>
          {provided.placeholder}
        </motion.div>
      )}
    </Droppable>
  );
}
