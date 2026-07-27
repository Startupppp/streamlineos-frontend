"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KanbanBoard } from "@/features/build/views/kanban-board";
import { ListView } from "@/features/build/views/list-view";
import { TableView } from "@/features/build/views/table-view";
import { DEFAULT_DISPLAY_OPTIONS } from "@/features/build/views/display-options-panel";
import { pmSnappy, viewSwap, viewSwapReduced } from "@/features/build/shared/pm-motion";
import type { KanbanTicket, DisplayOptions } from "@/features/build/shared/types";
import type { MyTicketsView } from "./my-tickets-view";

interface ProjectStatus {
  id: number;
  name: string;
  color: string | null;
  order: number;
  wipLimit?: number | null;
  type?: string | null;
}

interface MyTicketsViewBodyProps {
  view: MyTicketsView;
  tickets: KanbanTicket[];
  projectId: number;
  projectKey: string;
  statuses: ProjectStatus[] | undefined;
  wipLimits: Record<string, number>;
  onTicketSelect: (id: number) => void;
  displayOptions?: DisplayOptions;
}

export function MyTicketsViewBody({
  view,
  tickets,
  projectId,
  projectKey,
  statuses,
  wipLimits,
  onTicketSelect,
  displayOptions = DEFAULT_DISPLAY_OPTIONS,
}: MyTicketsViewBodyProps) {
  const shouldReduceMotion = useReducedMotion();
  const swapVariants = shouldReduceMotion ? viewSwapReduced : viewSwap;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {view === "board" ? (
        <motion.div
          key="board"
          className="flex h-full min-h-0 w-full flex-1 flex-col pb-1"
          variants={swapVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pmSnappy}
        >
          <KanbanBoard
            tickets={tickets}
            projectId={projectId}
            projectKey={projectKey}
            statuses={statuses}
            wipLimits={wipLimits}
            onTicketSelect={onTicketSelect}
            displayOptions={displayOptions}
          />
        </motion.div>
      ) : null}
      {view === "list" ? (
        <motion.div
          key="list"
          className="min-h-0 flex-1"
          variants={swapVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pmSnappy}
        >
          <ScrollArea fill hideScrollbar className="h-full min-h-0">
            <div className="overscroll-contain pb-1">
              <ListView
                tickets={tickets}
                onTicketClick={onTicketSelect}
                projectKey={projectKey}
                projectStatuses={statuses}
                displayOptions={displayOptions}
                projectId={projectId}
              />
            </div>
          </ScrollArea>
        </motion.div>
      ) : null}
      {view === "table" ? (
        <motion.div
          key="table"
          className="min-h-0 flex-1"
          variants={swapVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pmSnappy}
        >
          <ScrollArea fill hideScrollbar className="h-full min-h-0">
            <div className="overscroll-contain pb-1">
              <TableView
                tickets={tickets}
                onTicketClick={onTicketSelect}
                projectKey={projectKey}
                projectId={projectId}
                projectStatuses={statuses}
                displayOptions={displayOptions}
              />
            </div>
          </ScrollArea>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
