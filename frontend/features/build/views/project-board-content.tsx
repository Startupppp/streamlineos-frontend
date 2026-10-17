"use client";

import { useMemo } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import type { KanbanTicket, DisplayOptions } from "@/features/build/shared/types";
import type { ViewType } from "./view-switcher";
import type { BoardFilters } from "@/hooks/api/build/ticket-queries";
import type { FilterState as WorkloadFilterState, MemberCapacityData } from "./workload-types";
import type { Cycle } from "@/types/projects";
import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import type { ProjectStatus, BoardMember } from "./board-types";
import { useCan } from "@/hooks/api/access";
import { useModules } from "@/hooks/api/build/modules";
import { ModuleNamesProvider } from "./module-names-context";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { ProjectBoardViewPane } from "./project-board-view-pane";
import {
  OfflineEmptyState,
  FirstRunEmptyState,
  FilteredEmptyState,
} from "./project-board-empty-states";

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
  onBulkLabel?: (labelId: string) => void;
  onBulkArchive?: () => void;
  onBulkExport?: () => void;
  labels?: { id: number; name: string; color?: string | null }[];
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
  dataUpdatedAt?: number;
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
  onBulkLabel,
  onBulkArchive,
  onBulkExport,
  labels,
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
  dataUpdatedAt,
}: ProjectBoardContentProps) {
  const shouldReduceMotion = useReducedMotion();
  const isOnline = useOnlineStatus();
  const canUpdate = useCan("build:tickets:update");
  const { data: modules } = useModules(projectId);
  const resolution = usePageState({
    permission: "build:tickets:view",
    isLoading,
    isError,
    error,
    isEmpty: view !== "workload" && filteredTickets.length === 0,
  });
  const selection = useMemo(
    () => canUpdate ? { selected: selectedIds, onChange: onSelectionChange } : undefined,
    [canUpdate, selectedIds, onSelectionChange],
  );

  return (
    <ModuleNamesProvider modules={modules}>
    <div className={cn(PAGE_CHROME_X, "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden")}>
      <PageState
        resolution={resolution}
        loading={<KanbanBoardSkeleton />}
        empty={
          !isOnline
            ? <OfflineEmptyState dataUpdatedAt={dataUpdatedAt} />
            : hasActiveFilters || showEmptyFilterState
              ? <FilteredEmptyState onClearSearch={onClearSearch} />
              : <FirstRunEmptyState />
        }
        onRetry={onRetry}
        className="min-w-0 overflow-hidden flex-1"
      >
        <AnimatePresence mode="wait" initial={false}>
          <ProjectBoardViewPane
            view={view}
            filteredTickets={filteredTickets}
            projectId={projectId}
            projectKey={projectKey}
            statuses={statuses}
            wipLimits={wipLimits}
            displayOptions={displayOptions}
            hideCompleted={hideCompleted}
            hasActiveFilters={hasActiveFilters}
            boardFilters={boardFilters}
            onTicketSelect={onTicketSelect}
            selectedIds={selectedIds}
            members={members}
            cycles={cycles}
            labels={labels}
            onBulkStatus={onBulkStatus}
            onBulkPriority={onBulkPriority}
            onBulkAssignee={onBulkAssignee}
            onBulkCycle={onBulkCycle}
            onBulkParent={onBulkParent}
            onBulkLabel={onBulkLabel}
            onBulkArchive={onBulkArchive}
            onBulkExport={onBulkExport}
            onClearSelection={onClearSelection}
            onSelectionChange={onSelectionChange}
            workloadFilters={workloadFilters}
            onWorkloadFilterChange={onWorkloadFilterChange}
            onClearWorkloadFilters={onClearWorkloadFilters}
            capacityByMemberId={capacityByMemberId}
            focusedTicketId={focusedTicketId}
            canUpdate={canUpdate}
            selection={selection}
            shouldReduceMotion={shouldReduceMotion}
          />
        </AnimatePresence>
        <InfiniteScrollSentinel
          hasNextPage={isTruncated}
          isFetchingNextPage={isFetchingMore}
          onLoadMore={onLoadMore}
          label="Load more tickets"
        />
      </PageState>
    </div>
    </ModuleNamesProvider>
  );
}
