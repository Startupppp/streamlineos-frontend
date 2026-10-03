"use client";

import { memo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KanbanBoard } from "@/features/build/views/kanban-board";
import { ListView } from "@/features/build/views/list-view";
import { TableView } from "@/features/build/views/table-view";
import { pmSnappy, viewSwap, viewSwapReduced } from "@/lib/motion-presets";
import type { KanbanTicket, DisplayOptions } from "@/features/build/shared/types";
import type { AllWorkTicketMeta } from "./map-all-work-ticket";
import type { MyWorkView } from "./my-work-view";
import { buildMyWorkReturnHref, getMyWorkTicketHref } from "@/features/build/ticket-details/build-ticket-detail-url";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";

interface MyWorkViewBodyProps {
  view: MyWorkView;
  tickets: KanbanTicket[];
  displayOptions: DisplayOptions;
  ticketMeta: Map<number, AllWorkTicketMeta>;
}

export const MyWorkViewBody = memo(function MyWorkViewBody({
  view,
  tickets,
  displayOptions,
  ticketMeta,
}: MyWorkViewBodyProps) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const searchParams = useSearchParams();
  const returnHref = buildMyWorkReturnHref(searchParams);
  const shouldReduceMotion = useReducedMotion();
  const swapVariants = shouldReduceMotion ? viewSwapReduced : viewSwap;

  const handleTicketSelect = useCallback(
    (id: number) => {
      const meta = ticketMeta.get(id);
      if (!meta) return;
      requestLeave(() =>
        router.push(
          getMyWorkTicketHref(meta.projectId, meta.projectKey, meta.ticketNumber, returnHref),
        ),
      );
    },
    [ticketMeta, requestLeave, returnHref, router],
  );

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
            projectId={0}
            onTicketSelect={handleTicketSelect}
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
                onTicketClick={handleTicketSelect}
                displayOptions={displayOptions}
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
                onTicketClick={handleTicketSelect}
                displayOptions={displayOptions}
              />
            </div>
          </ScrollArea>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
});
