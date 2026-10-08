"use client";

import { ChevronDownIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TablePagination } from "@/components/ui/table-pagination";
import { BuildPaginatedContent } from "@/features/build/shared/build-paginated-content";
import { CycleVelocityPanel } from "./cycle-velocity-panel";
import type { Cycle } from "@/types/projects";
import type { RefObject } from "react";
import type { IconHandle } from "@animateicons/react";

interface CyclesSectionsProps {
  projectId: number;
  isOnline: boolean;
  dataUpdatedAt: number | undefined;
  activeCycles: Cycle[];
  upcomingCycles: Cycle[];
  completedCycles: Cycle[];
  displayedCycles: Cycle[];
  showCompleted: boolean;
  hasMoreCycles: boolean;
  hasPrevious: boolean;
  pageNumber: number;
  completedChevronRef: RefObject<IconHandle | null>;
  completedChevronHoverHandlers: { onMouseEnter: () => void; onMouseLeave: () => void };
  onToggleCompleted: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  renderCycleCard: (cycle: Cycle) => React.ReactNode;
}

export function CyclesSections({
  projectId,
  isOnline,
  dataUpdatedAt,
  activeCycles,
  upcomingCycles,
  completedCycles,
  displayedCycles,
  showCompleted,
  hasMoreCycles,
  hasPrevious,
  pageNumber,
  completedChevronRef,
  completedChevronHoverHandlers,
  onToggleCompleted,
  onNextPage,
  onPreviousPage,
  renderCycleCard,
}: CyclesSectionsProps) {
  return (
    <BuildPaginatedContent
      ariaLabel="Cycles"
      contentClassName="flex flex-col gap-6"
      footer={(
        <TablePagination
          mode="cursor"
          rowCount={displayedCycles.length}
          pageNumber={pageNumber}
          hasMore={hasMoreCycles}
          hasPrevious={hasPrevious}
          onNext={onNextPage}
          onPrevious={onPreviousPage}
        />
      )}
    >
        {!isOnline ? (
          <div
            className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
            data-testid="offline-banner"
          >
            <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              You&apos;re offline — these cycles may be out of date.
              {dataUpdatedAt ? (
                <span data-testid="offline-banner-freshness">
                  {" "}
                  Last updated{" "}
                  {formatDistanceToNow(new Date(dataUpdatedAt), {
                    addSuffix: true,
                  })}
                  .
                </span>
              ) : null}
            </p>
          </div>
        ) : null}
        {activeCycles.length > 0 ? (
          <section>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Active
            </p>
            <div className="grid gap-3">
              {activeCycles.map(renderCycleCard)}
            </div>
          </section>
        ) : null}

        {activeCycles.length > 0 && upcomingCycles.length > 0 ? (
          <div className="border-t border-border" />
        ) : null}

        {upcomingCycles.length > 0 ? (
          <section>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Upcoming
            </p>
            <div className="grid gap-3">
              {upcomingCycles.map(renderCycleCard)}
            </div>
          </section>
        ) : null}

        {completedCycles.length > 0 ? (
          <>
            {activeCycles.length > 0 || upcomingCycles.length > 0 ? (
              <div className="border-t border-border" />
            ) : null}
            <section>
              <button
                type="button"
                onClick={onToggleCompleted}
                aria-expanded={showCompleted}
                aria-controls="completed-cycles"
                className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
                {...completedChevronHoverHandlers}
              >
                {showCompleted ? (
                  <ChevronDownIcon ref={completedChevronRef} size={12} />
                ) : (
                  <ChevronRightIcon ref={completedChevronRef} size={12} />
                )}
                Completed ({completedCycles.length})
              </button>
              {showCompleted ? (
                <div id="completed-cycles" className="grid gap-3">
                  {completedCycles.map(renderCycleCard)}
                </div>
              ) : null}
            </section>
          </>
        ) : null}
        <CycleVelocityPanel projectId={projectId} />
    </BuildPaginatedContent>
  );
}
