import type { KanbanTicket, DisplayOptions } from "@/features/build/shared/types";
import type { FilterState as WorkloadFilterState } from "./workload-types";
import type { ProjectStatus, BoardMember } from "./use-board-url-state";

export const DISPLAY_OPTIONS: DisplayOptions = {
  columnBy: "status",
  rowBy: "none",
  groupBy: "status",
  orderBy: "manual",
  orderCompleteByRecency: false,
  completedIssues: "all",
  showSubIssues: false,
  showEmptyGroups: false,
  showEmptyColumns: false,
  showEmptyRows: false,
  showId: false,
  showStatus: true,
  showAssignee: true,
  showPriority: true,
  showEstimate: false,
  showCycle: false,
  showLabels: false,
  showDescription: false,
  showDueDate: false,
  showProject: false,
  showMilestone: false,
  showLinks: false,
  showTimeInStatus: false,
  showCreated: false,
  showUpdated: false,
  showPRs: false,
};

export const WORKLOAD_FILTERS: WorkloadFilterState = {
  statCard: "all",
  sprintId: "all",
  cycleId: "all",
  priority: "all",
  type: "all",
  status: "all",
  assigneeId: "all",
  showUnassigned: true,
};

export const noop = () => undefined;

export function buildBaseProps(
  filteredTickets: KanbanTicket[] = [],
  truncation: { isTruncated: boolean; isFetchingMore?: boolean; onLoadMore?: () => void } = {
    isTruncated: false,
  },
) {
  return {
    view: "board" as const,
    filteredTickets,
    showEmptyFilterState: false,
    onClearSearch: noop,
    projectId: 1,
    projectKey: "TEST",
    statuses: [] as ProjectStatus[],
    wipLimits: {} as Record<string, number>,
    members: [] as BoardMember[],
    displayOptions: DISPLAY_OPTIONS,
    hideCompleted: false,
    hasActiveFilters: true,
    workloadFilters: WORKLOAD_FILTERS,
    onClearWorkloadFilters: noop,
    onTicketSelect: noop,
    onWorkloadFilterChange: noop as <K extends keyof WorkloadFilterState>(
      key: K,
      value: WorkloadFilterState[K],
    ) => void,
    sprints: [],
    selectedIds: new Set<string | number>(),
    onBulkStatus: noop,
    onBulkPriority: noop,
    onBulkAssignee: noop,
    onBulkSprint: noop,
    onBulkParent: noop,
    onClearSelection: noop,
    onSelectionChange: noop as (sel: Set<string | number>) => void,
    isTruncated: truncation.isTruncated,
    isFetchingMore: truncation.isFetchingMore ?? false,
    onLoadMore: truncation.onLoadMore ?? noop,
    isLoading: false,
    isError: false,
    error: undefined as unknown,
    onRetry: noop,
  };
}
