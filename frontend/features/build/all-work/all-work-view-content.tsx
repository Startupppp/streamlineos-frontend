"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TablePagination } from "@/components/ui/table-pagination";
import { BuildPaginatedContent } from "@/features/build/shared/build-paginated-content";
import { cn } from "@/lib/utils";
import { pmSnappy, viewSwap, viewSwapReduced } from "@/lib/motion-presets";
import type { AllWorkTicket } from "@/types/projects";
import { AllWorkListSection } from "./all-work-list-section";
import { AllWorkTableSection } from "./all-work-table-section";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import type { TicketGroup } from "./all-work-ticket-utils";
import type { AllWorkView } from "./all-work-view-switcher";

const AllWorkBoardSection = dynamic(
  () => import("./all-work-board-section").then((m) => m.AllWorkBoardSection),
  { ssr: false, loading: () => <KanbanBoardSkeleton /> },
);

const AllWorkCalendarSection = dynamic(
  () => import("./all-work-calendar-section").then((m) => m.AllWorkCalendarSection),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> },
);

const AllWorkTimelineSection = dynamic(
  () => import("./all-work-timeline-section").then((m) => m.AllWorkTimelineSection),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> },
);

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
      <BuildPaginatedContent
        ariaLabel="All Work calendar"
        contentClassName="overflow-hidden"
        footer={paginationNode}
      >
        <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
          <AllWorkCalendarSection tickets={tickets} hasMore={hasMore} />
        </ScrollArea>
      </BuildPaginatedContent>
    );
  }

  if (view === "timeline") {
    return (
      <BuildPaginatedContent
        ariaLabel="All Work timeline"
        contentClassName="overflow-hidden"
        footer={paginationNode}
      >
        <AllWorkTimelineSection
          tickets={tickets}
          hasMore={hasMore}
          onTicketClick={onTicketClick}
        />
      </BuildPaginatedContent>
    );
  }

  return (
    <BuildPaginatedContent
      ariaLabel={view === "board" ? "All Work board" : "All Work list"}
      contentClassName="overflow-hidden"
      footer={paginationNode}
    >
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
    </BuildPaginatedContent>
  );
}
