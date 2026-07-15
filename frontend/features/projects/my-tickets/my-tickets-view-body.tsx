"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { KanbanBoard } from "@/features/projects/views/kanban-board";
import { ListView } from "@/features/projects/views/list-view";
import { TableView } from "@/features/projects/views/table-view";
import { DEFAULT_DISPLAY_OPTIONS } from "@/features/projects/views/display-options-panel";
import { pmSnappy, viewSwap, viewSwapReduced } from "@/features/projects/shared/pm-motion";
import type { KanbanTicket } from "@/features/projects/shared/types";
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
}

export function MyTicketsViewBody({
  view,
  tickets,
  projectId,
  projectKey,
  statuses,
  wipLimits,
  onTicketSelect,
}: MyTicketsViewBodyProps) {
  const shouldReduceMotion = useReducedMotion();
  const swapVariants = shouldReduceMotion ? viewSwapReduced : viewSwap;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {view === "board" ? (
        <motion.div
          key="board"
          className="flex h-full min-h-0 w-full flex-1 flex-col px-3 pb-1"
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
            displayOptions={DEFAULT_DISPLAY_OPTIONS}
          />
        </motion.div>
      ) : null}
      {view === "list" ? (
        <motion.div
          key="list"
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-1"
          variants={swapVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pmSnappy}
        >
          <ListView
            tickets={tickets}
            onTicketClick={onTicketSelect}
            projectKey={projectKey}
            projectStatuses={statuses}
            displayOptions={DEFAULT_DISPLAY_OPTIONS}
            projectId={projectId}
          />
        </motion.div>
      ) : null}
      {view === "table" ? (
        <motion.div
          key="table"
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-1"
          variants={swapVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pmSnappy}
        >
          <TableView
            tickets={tickets}
            onTicketClick={onTicketSelect}
            projectKey={projectKey}
            projectId={projectId}
            projectStatuses={statuses}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
