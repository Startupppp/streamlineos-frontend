import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      className,
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

jest.mock("next/dynamic", () => () => () => null);

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
}));

jest.mock("./table-view", () => ({ TableView: () => null }));
jest.mock("./calendar-view", () => ({ CalendarView: () => null }));
jest.mock("./gantt-view", () => ({ GanttView: () => null }));
jest.mock("./workload-view", () => ({ WorkloadView: () => null }));

jest.mock("@/features/build/backlog/bulk-action-bar", () => ({
  BulkActionBar: () => null,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ui/kanban-skeleton", () => ({
  KanbanBoardSkeleton: () => null,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => null,
}));

jest.mock("@/lib/motion-presets", () => ({
  pmSnappy: {},
  viewSwap: {},
  viewSwapReduced: {},
}));

jest.mock("@/components/pm-chrome", () => ({ PM_PANEL: "" }));

jest.mock("@/components/ui/content-fill-panel", () => ({
  PAGE_CHROME_X: "",
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: (string | false | undefined | null)[]) =>
    args.filter(Boolean).join(" "),
}));

import { ProjectBoardContent } from "./project-board-content";
import type { KanbanTicket, DisplayOptions } from "@/features/build/shared/types";
import type { FilterState as WorkloadFilterState } from "./workload-types";
import type { ProjectStatus, BoardMember } from "./use-board-url-state";

const DISPLAY_OPTIONS: DisplayOptions = {
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

const WORKLOAD_FILTERS: WorkloadFilterState = {
  statCard: "all",
  sprintId: "all",
  cycleId: "all",
  priority: "all",
  type: "all",
  status: "all",
  assigneeId: "all",
  showUnassigned: true,
};

const noop = () => undefined;

function buildBaseProps(
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
  };
}

describe("ProjectBoardContent — truncation notice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a truncation notice when the board query has a next page that was not auto-loaded because filters were active", () => {
    const tickets = Array.from({ length: 3 }, (_, i) => ({ id: i })) as unknown as KanbanTicket[];
    render(<ProjectBoardContent {...buildBaseProps(tickets, { isTruncated: true })} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing the first 3");
  });

  it("does not render a truncation notice when all matching tickets fit within the first page", () => {
    render(<ProjectBoardContent {...buildBaseProps([], { isTruncated: false })} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("the load-more button asks its owner for the next page, so the board has exactly one query and one filter derivation", async () => {
    const onLoadMore = jest.fn();

    render(
      <ProjectBoardContent
        {...buildBaseProps([{ id: 1 } as unknown as KanbanTicket], { isTruncated: true, onLoadMore })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /load more/i }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
