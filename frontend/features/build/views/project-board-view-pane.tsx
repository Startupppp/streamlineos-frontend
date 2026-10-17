"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { TableView } from "./table-view";
import { GanttView } from "./gantt-view";
import { WorkloadView } from "./workload-view";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { KanbanTicket, DisplayOptions } from "@/features/build/shared/types";
import type { ViewType } from "./view-switcher";
import type { BoardFilters } from "@/hooks/api/build/ticket-queries";
import type { FilterState as WorkloadFilterState, MemberCapacityData } from "./workload-types";
import type { Cycle } from "@/types/projects";
import { pmSnappy, viewSwap, viewSwapReduced } from "@/lib/motion-presets";
import type { ProjectStatus, BoardMember } from "./board-types";

const KanbanBoard = dynamic(
  () => import("./kanban-board").then((m) => m.KanbanBoard),
  { ssr: false, loading: () => <KanbanBoardSkeleton /> },
);

const ListView = dynamic(
  () => import("./list-view").then((m) => m.ListView),
  { ssr: false, loading: () => <Skeleton className="flex-1 min-h-[400px] rounded-xl" /> },
);

interface ProjectBoardViewPaneProps {
  view: ViewType;
  filteredTickets: KanbanTicket[];
  projectId: number;
  projectKey: string;
  statuses: ProjectStatus[] | undefined;
  wipLimits: Record<string, number>;
  displayOptions: DisplayOptions;
  hideCompleted: boolean;
  hasActiveFilters: boolean;
  boardFilters?: BoardFilters;
  onTicketSelect: (id: number) => void;
  selectedIds: Set<string | number>;
  members: BoardMember[];
  cycles: Cycle[];
  labels?: { id: number; name: string; color?: string | null }[];
  onBulkStatus: (v: string) => void;
  onBulkPriority: (v: string) => void;
  onBulkAssignee: (v: string) => void;
  onBulkCycle: (v: string) => void;
  onBulkParent: (parentTicketId: number | null) => void;
  onBulkLabel?: (labelId: string) => void;
  onBulkArchive?: () => void;
  onBulkExport?: () => void;
  onClearSelection: () => void;
  onSelectionChange: (sel: Set<string | number>) => void;
  workloadFilters: WorkloadFilterState;
  onWorkloadFilterChange: <K extends keyof WorkloadFilterState>(
    key: K,
    value: WorkloadFilterState[K],
  ) => void;
  onClearWorkloadFilters: () => void;
  capacityByMemberId?: Map<string, MemberCapacityData>;
  focusedTicketId?: number | null;
  canUpdate: boolean;
  selection: { selected: Set<string | number>; onChange: (sel: Set<string | number>) => void } | undefined;
  shouldReduceMotion: boolean | null;
}

export function ProjectBoardViewPane({
  view,
  filteredTickets,
  projectId,
  projectKey,
  statuses,
  wipLimits,
  displayOptions,
  hideCompleted,
  hasActiveFilters,
  boardFilters,
  onTicketSelect,
  selectedIds,
  members,
  cycles,
  labels,
  onBulkStatus,
  onBulkPriority,
  onBulkAssignee,
  onBulkCycle,
  onBulkParent,
  onBulkLabel,
  onBulkArchive,
  onBulkExport,
  onClearSelection,
  workloadFilters,
  onWorkloadFilterChange,
  onClearWorkloadFilters,
  capacityByMemberId,
  focusedTicketId,
  canUpdate,
  selection,
  shouldReduceMotion,
}: ProjectBoardViewPaneProps) {
  const viewVariants = shouldReduceMotion ? viewSwapReduced : viewSwap;

  switch (view) {
    case "calendar":
      return null;
    case "board":
      return (
        <motion.div
          key="board"
          className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden pb-1"
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
              labels={labels}
              projectId={projectId}
              excludeIds={selectedIds}
              onBulkStatus={onBulkStatus}
              onBulkPriority={onBulkPriority}
              onBulkAssignee={onBulkAssignee}
              onBulkCycle={onBulkCycle}
              onBulkParent={onBulkParent}
              onBulkLabel={onBulkLabel}
              onBulkArchive={onBulkArchive}
              onBulkExport={onBulkExport}
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
                  labels={labels}
                  projectId={projectId}
                  excludeIds={selectedIds}
                  onBulkStatus={onBulkStatus}
                  onBulkPriority={onBulkPriority}
                  onBulkAssignee={onBulkAssignee}
                  onBulkCycle={onBulkCycle}
                  onBulkParent={onBulkParent}
                  onBulkLabel={onBulkLabel}
                  onBulkArchive={onBulkArchive}
                  onBulkExport={onBulkExport}
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
            projectStatuses={statuses}
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
