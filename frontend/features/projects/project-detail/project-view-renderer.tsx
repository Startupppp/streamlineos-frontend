"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KanbanBoard } from "@/features/projects/views/kanban-board";
import { ListView } from "@/features/projects/views/list-view";
import { TableView } from "@/features/projects/views/table-view";
import { CalendarView } from "@/features/projects/views/calendar-view";
import { GanttView } from "@/features/projects/views/gantt-view";
import { WorkloadView } from "@/features/projects/views/workload-view";
import { BulkActionBar } from "@/features/projects/backlog/bulk-action-bar";
import { pmSnappy } from "@/features/projects/shared/pm-motion";
import type { ViewType } from "@/features/projects/views/view-switcher";
import type { KanbanTicket, DisplayOptions } from "@/features/projects/shared/types";
import type { FilterState as WorkloadFilterState } from "@/features/projects/views/workload-types";
import type { Sprint } from "@/types/projects";
import type { Variants } from "framer-motion";

interface ProjectStatus {
  id: number;
  name: string;
  color: string | null;
  order: number;
  wipLimit?: number | null;
  type?: string | null;
}

interface Member {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
}

interface ProjectViewRendererProps {
  view: ViewType;
  viewVariants: Variants;
  filteredTickets: KanbanTicket[];
  projectId: number;
  projectKey: string;
  statuses: ProjectStatus[] | undefined;
  wipLimits: Record<string, number>;
  onTicketSelect: (id: number) => void;
  displayOptions: DisplayOptions;
  hideCompleted: boolean;
  selectedIds: Set<string | number>;
  members: Member[];
  sprints: Sprint[];
  workloadFilters: WorkloadFilterState;
  onWorkloadFilterChange: <K extends keyof WorkloadFilterState>(
    key: K,
    value: WorkloadFilterState[K],
  ) => void;
  onBulkStatus: (v: string) => void;
  onBulkPriority: (v: string) => void;
  onBulkAssignee: (v: string) => void;
  onBulkSprint: (v: string) => void;
  onClearSelection: () => void;
  onSelectionChange: (sel: Set<string | number>) => void;
}

export function ProjectViewRenderer({
  view,
  viewVariants,
  filteredTickets,
  projectId,
  projectKey,
  statuses,
  wipLimits,
  onTicketSelect,
  displayOptions,
  hideCompleted,
  selectedIds,
  members,
  sprints,
  workloadFilters,
  onWorkloadFilterChange,
  onBulkStatus,
  onBulkPriority,
  onBulkAssignee,
  onBulkSprint,
  onClearSelection,
  onSelectionChange,
}: ProjectViewRendererProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AnimatePresence mode="wait" initial={false}>
        {view === "board" ? (
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
            />
          </motion.div>
        ) : null}
        {view === "list" ? (
          <motion.div
            key="list"
            className="min-h-0 flex-1 flex flex-col overflow-hidden pb-1"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pmSnappy}
          >
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
                />
              </div>
            </ScrollArea>
          </motion.div>
        ) : null}
        {view === "table" ? (
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
                {selectedIds.size > 0 && (
                  <BulkActionBar
                    selectedCount={selectedIds.size}
                    members={members}
                    sprints={sprints}
                    onBulkStatus={onBulkStatus}
                    onBulkPriority={onBulkPriority}
                    onBulkAssignee={onBulkAssignee}
                    onBulkSprint={onBulkSprint}
                    onClear={onClearSelection}
                  />
                )}
                <TableView
                  tickets={filteredTickets}
                  onTicketClick={onTicketSelect}
                  projectKey={projectKey}
                  projectId={projectId}
                  projectStatuses={statuses}
                  selection={{ selected: selectedIds, onChange: onSelectionChange }}
                />
              </div>
            </ScrollArea>
          </motion.div>
        ) : null}
        {view === "calendar" ? (
          <motion.div
            key="calendar"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2 pt-0 sm:px-6"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pmSnappy}
          >
            <CalendarView
              tickets={filteredTickets}
              onTicketClick={onTicketSelect}
              projectId={projectId}
              projectStatuses={statuses}
            />
          </motion.div>
        ) : null}
        {view === "gantt" ? (
          <motion.div
            key="gantt"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2 pt-0 sm:px-6"
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
        ) : null}
        {view === "workload" ? (
          <motion.div
            key="workload"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2 pt-0 sm:px-6"
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
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
