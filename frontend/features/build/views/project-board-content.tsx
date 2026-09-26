"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { TableView } from "./table-view";
import { GanttView } from "./gantt-view";
import { WorkloadView } from "./workload-view";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { SearchX, WifiOff } from "lucide-react";
import type { KanbanTicket, DisplayOptions } from "@/features/build/shared/types";
import type { ViewType } from "./view-switcher";
import type { BoardFilters } from "@/hooks/api/build/ticket-queries";

import { type FilterState as WorkloadFilterState, type MemberCapacityData } from "./workload-types";
import type { Cycle } from "@/types/projects";
import { pmSnappy, viewSwap, viewSwapReduced } from "@/lib/motion-presets";
import { PM_PANEL } from "@/components/pm-chrome";
import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import type { ProjectStatus, BoardMember } from "./use-board-url-state";
import { useCan } from "@/hooks/api/access";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";

const KanbanBoard = dynamic(
  () => import("./kanban-board").then((m) => m.KanbanBoard),
  { ssr: false, loading: () => <KanbanBoardSkeleton /> },
);

const ListView = dynamic(
  () => import("./list-view").then((m) => m.ListView),
  { ssr: false, loading: () => <Skeleton className="flex-1 min-h-[400px] rounded-xl" /> },
);

interface ProjectBoardContentProps {
  view: ViewType;
  filteredTickets: KanbanTicket[];
  showEmptyFilterState: boolean;
  onClearSearch: () => void;
  projectId: number;
  projectKey: string;
  statuses: ProjectStatus[] | undefined;
  wipLimits: Record<string, number>;
  members: BoardMember[];
  displayOptions: DisplayOptions;
  hideCompleted: boolean;
  hasActiveFilters: boolean;
  boardFilters?: BoardFilters;
  workloadFilters: WorkloadFilterState;
  onTicketSelect: (id: number) => void;
  onWorkloadFilterChange: <K extends keyof WorkloadFilterState>(
    key: K,
    value: WorkloadFilterState[K],
  ) => void;
  onClearWorkloadFilters: () => void;
  capacityByMemberId?: Map<string, MemberCapacityData>;
  cycles: Cycle[];
  selectedIds: Set<string | number>;
  onBulkStatus: (v: string) => void;
  onBulkPriority: (v: string) => void;
  onBulkAssignee: (v: string) => void;
  onBulkCycle: (v: string) => void;
  onBulkParent: (parentTicketId: number | null) => void;
  onClearSelection: () => void;
  onSelectionChange: (sel: Set<string | number>) => void;
  isTruncated: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  focusedTicketId?: number | null;
}

export function ProjectBoardContent({
  view,
  filteredTickets,
  showEmptyFilterState,
  onClearSearch,
  projectId,
  projectKey,
  statuses,
  wipLimits,
  members,
  displayOptions,
  hideCompleted,
  hasActiveFilters,
  boardFilters,
  workloadFilters,
  onTicketSelect,
  onWorkloadFilterChange,
  onClearWorkloadFilters,
  capacityByMemberId,
  cycles,
  selectedIds,
  onBulkStatus,
  onBulkPriority,
  onBulkAssignee,
  onBulkCycle,
  onBulkParent,
  onClearSelection,
  onSelectionChange,
  isTruncated,
  isFetchingMore,
  onLoadMore,
  isLoading,
  isError,
  error,
  onRetry,
  focusedTicketId,
}: ProjectBoardContentProps) {
  const shouldReduceMotion = useReducedMotion();
  const isOnline = useOnlineStatus();
  const canUpdate = useCan("build:tickets:update");
  const resolution = usePageState({
    permission: "build:tickets:view",
    isLoading,
    isError,
    error,
    isEmpty: showEmptyFilterState,
  });
  const viewVariants = shouldReduceMotion ? viewSwapReduced : viewSwap;
  const selection = useMemo(
    () => canUpdate ? { selected: selectedIds, onChange: onSelectionChange } : undefined,
    [canUpdate, selectedIds, onSelectionChange],
  );

  const offlineEmptyState = (
    <div className="relative flex h-full flex-1 flex-col items-center justify-center py-12">
      <div
        className={cn(
          PM_PANEL,
          "relative flex w-full max-w-sm flex-col items-center gap-3 px-6 py-8 text-center",
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-primary/[0.06] shadow-sm">
          <WifiOff className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            You&apos;re offline
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Results may not be up to date. Reconnect to see the latest tickets.
          </p>
        </div>
      </div>
    </div>
  );

  const filteredEmptyState = (
    <div className="relative flex h-full flex-1 flex-col items-center justify-center py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 right-1/4 h-36 w-36 rounded-full bg-primary/[0.06] blur-3xl"
      />
      <div
        className={cn(
          PM_PANEL,
          "relative flex w-full max-w-sm flex-col items-center gap-3 px-6 py-8 text-center",
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-primary/[0.06] shadow-sm">
          <SearchX className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">No tickets match your filters</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Try adjusting your search or filters to find what you&apos;re looking for.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearSearch}
          className="mt-0.5 h-8 border-border/70 bg-background/60 text-xs backdrop-blur-sm"
        >
          Clear all filters
        </Button>
      </div>
    </div>
  );

  function renderViewPane(v: ViewType): React.ReactNode {
    switch (v) {
      case "calendar":
        return null;
      case "board":
        return (
          <motion.div
            key="board"
            className="flex h-full min-h-0 w-full flex-1 flex-col pb-1"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pmSnappy}
          >
            <KanbanBoard
              tickets={filteredTickets}
              projectId={projectId}
              projectKey={projectKey}
              statuses={statuses}
              wipLimits={wipLimits}
              onTicketSelect={onTicketSelect}
              displayOptions={displayOptions}
              hideCompleted={hideCompleted}
              hasActiveFilters={hasActiveFilters}
              filters={boardFilters}
            />
          </motion.div>
        );
      case "list":
        return (
          <motion.div
            key="list"
            className="min-h-0 flex-1 flex flex-col overflow-hidden pb-1"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pmSnappy}
          >
            {canUpdate && selectedIds.size > 0 && (
              <BulkActionBar
                selectedCount={selectedIds.size}
                members={members}
                cycles={cycles}
                statuses={statuses}
                projectId={projectId}
                excludeIds={selectedIds}
                onBulkStatus={onBulkStatus}
                onBulkPriority={onBulkPriority}
                onBulkAssignee={onBulkAssignee}
                onBulkCycle={onBulkCycle}
                onBulkParent={onBulkParent}
                onClear={onClearSelection}
              />
            )}
            <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
              <div className="overscroll-contain">
                <ListView
                  tickets={filteredTickets}
                  onTicketClick={onTicketSelect}
                  groupBy={displayOptions.groupBy !== "none" ? displayOptions.groupBy : undefined}
                  rowBy={displayOptions.rowBy !== "none" ? displayOptions.rowBy : undefined}
                  projectKey={projectKey}
                  projectStatuses={statuses}
                  displayOptions={displayOptions}
                  showEmptyColumns={displayOptions.showEmptyColumns}
                  showEmptyRows={displayOptions.showEmptyRows}
                  projectId={projectId}
                  selection={selection}
                  focusedTicketId={focusedTicketId}
                />
              </div>
            </ScrollArea>
          </motion.div>
        );
      case "table":
        return (
          <motion.div
            key="table"
            className="min-h-0 flex-1 flex flex-col overflow-hidden pb-1"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pmSnappy}
          >
            <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
              <div className="overscroll-contain">
                {canUpdate && selectedIds.size > 0 && (
                  <BulkActionBar
                    selectedCount={selectedIds.size}
                    members={members}
                    cycles={cycles}
                    statuses={statuses}
                    projectId={projectId}
                    excludeIds={selectedIds}
                    onBulkStatus={onBulkStatus}
                    onBulkPriority={onBulkPriority}
                    onBulkAssignee={onBulkAssignee}
                    onBulkCycle={onBulkCycle}
                    onBulkParent={onBulkParent}
                    onClear={onClearSelection}
                  />
                )}
                <TableView
                  tickets={filteredTickets}
                  onTicketClick={onTicketSelect}
                  projectKey={projectKey}
                  projectId={projectId}
                  projectStatuses={statuses}
                  displayOptions={displayOptions}
                  selection={selection}
                />
              </div>
            </ScrollArea>
          </motion.div>
        );
      case "timeline":
        return (
          <motion.div
            key="timeline"
            className="flex min-h-0 flex-1 flex-col overflow-hidden pb-2 pt-0"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pmSnappy}
          >
            <GanttView
              tickets={filteredTickets}
              projectId={projectId}
              onTicketClick={onTicketSelect}
            />
          </motion.div>
        );
      case "workload":
        return (
          <motion.div
            key="workload"
            className="flex min-h-0 flex-1 flex-col overflow-hidden pb-2 pt-0"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pmSnappy}
          >
            <WorkloadView
              tickets={filteredTickets}
              projectId={projectId}
              projectKey={projectKey}
              members={members}
              filters={workloadFilters}
              onFilterChange={onWorkloadFilterChange}
              onClearFilters={onClearWorkloadFilters}
              capacityByMemberId={capacityByMemberId}
            />
          </motion.div>
        );
      default:
        return null;
    }
  }

  return (
    <div className={cn(PAGE_CHROME_X, "flex min-h-0 flex-1 flex-col")}>
      <PageState
        resolution={resolution}
        loading={<KanbanBoardSkeleton />}
        empty={isOnline ? filteredEmptyState : offlineEmptyState}
        onRetry={onRetry}
        className="flex-1"
      >
        <AnimatePresence mode="wait" initial={false}>
          {renderViewPane(view)}
        </AnimatePresence>
        <InfiniteScrollSentinel
          hasNextPage={isTruncated}
          isFetchingNextPage={isFetchingMore}
          onLoadMore={onLoadMore}
          label="Load more tickets"
        />
      </PageState>
    </div>
  );
}
