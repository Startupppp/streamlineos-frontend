"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TablePagination } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";
import { pmSnappy, viewSwap, viewSwapReduced } from "@/lib/motion-presets";
import type { AllWorkTicket } from "@/types/projects";
import { AllWorkListSection } from "./all-work-list-section";
import { AllWorkTableSection } from "./all-work-table-section";
import { AllWorkBoardSection } from "./all-work-board-section";
import { AllWorkCalendarSection } from "./all-work-calendar-section";
import { AllWorkTimelineSection } from "./all-work-timeline-section";
import type { TicketGroup } from "./all-work-ticket-utils";
import type { AllWorkView } from "./all-work-view-switcher";

interface AllWorkViewContentProps {
  view: AllWorkView;
  tickets: AllWorkTicket[];
  groups: TicketGroup[];
  tableSelection: Set<string | number>;
  onSelectionChange: (selection: Set<string | number>) => void;
  sortState: Parameters<typeof AllWorkTableSection>[0]["sortState"];
  hasMore: boolean;
  hasPrevious: boolean;
  pageNumber: number;
  onNext: () => void;
  onPrevious: () => void;
  onTicketClick: (id: number) => void;
}

export function AllWorkViewContent({
  view,
  tickets,
  groups,
  tableSelection,
  onSelectionChange,
  sortState,
  hasMore,
  hasPrevious,
  pageNumber,
  onNext,
  onPrevious,
  onTicketClick,
}: AllWorkViewContentProps) {
  const shouldReduceMotion = useReducedMotion();
  const swapVariants = shouldReduceMotion ? viewSwapReduced : viewSwap;
  const paginationNode =
    hasMore || hasPrevious ? (
      <TablePagination
        mode="cursor"
        rowCount={tickets.length}
        pageNumber={pageNumber}
        hasMore={hasMore}
        hasPrevious={hasPrevious}
        onNext={onNext}
        onPrevious={onPrevious}
      />
    ) : null;

  if (view === "table") {
    return (
      <AllWorkTableSection
        tickets={tickets}
        tableSelection={tableSelection}
        onSelectionChange={onSelectionChange}
        onTicketClick={onTicketClick}
        sortState={sortState}
        hasMore={hasMore}
        hasPrevious={hasPrevious}
        pageNumber={pageNumber}
        onNext={onNext}
        onPrevious={onPrevious}
      />
    );
  }

  if (view === "calendar") {
    return (
      <>
        <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
          <AllWorkCalendarSection tickets={tickets} hasMore={hasMore} />
        </ScrollArea>
        {paginationNode}
      </>
    );
  }

  if (view === "timeline") {
    return (
      <>
        <AllWorkTimelineSection
          tickets={tickets}
          hasMore={hasMore}
          onTicketClick={onTicketClick}
        />
        {paginationNode}
      </>
    );
  }

  return (
    <>
      <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
        <div
          className={cn(
            "flex flex-1 flex-col overscroll-contain",
            view === "board" ? "h-full min-h-0" : "min-h-full",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {view === "list" ? (
              <motion.div
                key="list-view"
                variants={swapVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pmSnappy}
              >
                <AllWorkListSection
                  groups={groups}
                  hasMore={hasMore}
                  tableSelection={tableSelection}
                  onSelectionChange={onSelectionChange}
                />
              </motion.div>
            ) : null}
            {view === "board" ? (
              <motion.div
                key="board-view"
                variants={swapVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pmSnappy}
                className="flex h-full min-h-0 w-full flex-1 flex-col"
              >
                <AllWorkBoardSection
                  groups={groups}
                  hasMore={hasMore}
                  tableSelection={tableSelection}
                  onSelectionChange={onSelectionChange}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </ScrollArea>
      {paginationNode}
    </>
  );
}
