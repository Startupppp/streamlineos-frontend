import { act, fireEvent, render, screen } from "@testing-library/react";
import { CycleDetailPage } from "./cycle-detail-page";

const mockBuildListToolbar = jest.fn(
  ({
    trailing,
    className,
  }: {
    trailing?: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="build-list-toolbar" className={className}>
      <div data-testid="toolbar-search" />
      {trailing}
    </div>
  ),
);

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: jest.fn(),
}));

jest.mock("@/hooks/api/build/advanced", () => ({
  useCycles: jest.fn(),
}));

jest.mock("@/hooks/api/build/tickets", () => ({
  useProjectBoardTickets: jest.fn(),
  useBulkUpdateTickets: jest.fn(),
}));

jest.mock("@/hooks/api/build/project-members", () => ({
  useProjectMembers: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/features/build/shared/bulk-action-bar", () => ({
  BulkActionBar: ({
    onBulkStatus,
    onBulkPriority,
    onBulkAssignee,
    onBulkCycle,
  }: {
    onBulkStatus?: (v: string) => void;
    onBulkPriority?: (v: string) => void;
    onBulkAssignee?: (v: string) => void;
    onBulkCycle?: (v: string) => void;
  }) => (
    <div data-testid="bulk-action-bar">
      <button type="button" data-testid="bulk-status-btn" onClick={() => onBulkStatus?.("DONE")}>Status</button>
      <button type="button" data-testid="bulk-priority-btn" onClick={() => onBulkPriority?.("HIGH")}>Priority</button>
      <button type="button" data-testid="bulk-assignee-btn" onClick={() => onBulkAssignee?.("user-1")}>Assignee</button>
      <button type="button" data-testid="bulk-cycle-btn" onClick={() => onBulkCycle?.("3")}>Cycle</button>
    </div>
  ),
}));

jest.mock("@/hooks/api/build/ticket-queries", () => ({
  useTicketColumnCounts: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  useSearchParams: jest.fn(() => ({ get: jest.fn(() => null), toString: jest.fn(() => "") })),
  usePathname: jest.fn(() => "/build/1/cycles/1"),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: jest.fn(),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: (props: Parameters<typeof mockBuildListToolbar>[0]) =>
    mockBuildListToolbar(props),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, filters }: { children: React.ReactNode; title?: string; filters?: React.ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/ui/kanban-skeleton", () => ({
  KanbanBoardSkeleton: () => <div data-testid="kanban-skeleton" />,
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  PAGE_CHROME_X: "page-chrome-x",
}));

jest.mock("@/features/build/views/kanban-board", () => ({
  KanbanBoard: () => <div data-testid="kanban-board" />,
}));

jest.mock("@/features/build/views/list-view", () => ({
  ListView: ({
    tickets,
    selection,
  }: {
    tickets?: Array<{ id: number; title: string }>;
    selection?: { onChange: (ids: Set<string | number>) => void };
  }) => (
    <div data-testid="list-view">
      {tickets?.map((t) => (
        <button
          key={t.id}
          type="button"
          role="checkbox"
          aria-label={`Select ticket ${t.id}`}
          onClick={() => selection?.onChange(new Set([t.id]))}
        />
      ))}
    </div>
  ),
}));

jest.mock("@/features/build/views/view-switcher", () => ({
  ViewSwitcher: () => <button type="button">View</button>,
  parseViewType: jest.fn(() => "board"),
}));

jest.mock("@/features/build/views/display-options-panel", () => ({
  DisplayOptionsPanel: () => <button type="button">Display</button>,
  DEFAULT_DISPLAY_OPTIONS: { groupBy: "none", rowBy: "none", showEmptyColumns: false, showEmptyRows: false },
}));

jest.mock("@/features/build/ticket-details/build-ticket-detail-url", () => ({
  buildTicketDetailUrl: jest.fn(() => null),
}));

import { useProject } from "@/hooks/api/build/projects";
import { useCycles } from "@/hooks/api/build/advanced";
import { useProjectBoardTickets, useBulkUpdateTickets } from "@/hooks/api/build/tickets";
import { useTicketColumnCounts } from "@/hooks/api/build/ticket-queries";
import { useCan, useAccess } from "@/hooks/api/access";
import { notFound } from "next/navigation";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { parseViewType } from "@/features/build/views/view-switcher";

const mockUseProject = useProject as jest.Mock;
const mockUseCycles = useCycles as jest.Mock;
const mockUseProjectBoardTickets = useProjectBoardTickets as jest.Mock;
const mockUseTicketColumnCounts = useTicketColumnCounts as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;
const mockUseBuildListKeyboard = useBuildListKeyboard as jest.Mock;
const mockParseViewType = parseViewType as jest.Mock;
const mockUseBulkUpdateTickets = useBulkUpdateTickets as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:cycles:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const mockNotFound = notFound as jest.MockedFunction<typeof notFound>;

function baseQueryResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

const CYCLE_ROW = {
  id: 5,
  orgId: "org-1",
  projectId: 1,
  name: "Q3 Iteration",
  description: null,
  status: "active" as const,
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  createdBy: "user-1",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  totalItems: 10,
  completedItems: 5,
  progress: 50,
};

beforeEach(() => {
  mockBuildListToolbar.mockClear();
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProject.mockReturnValue(
    baseQueryResult({ data: { id: 1, key: "PROJ", statuses: [], settings: null } }),
  );
  mockUseCycles.mockReturnValue(baseQueryResult({ data: [CYCLE_ROW] }));
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseTicketColumnCounts.mockReturnValue(baseQueryResult({ data: {} }));
  mockUseBuildListFilters.mockReturnValue({
    search: "", debouncedSearch: "", cursor: null,
    setSearch: jest.fn(), setCursor: jest.fn(), clearAll: jest.fn(),
    resetKey: "", value: jest.fn(() => ""), setValue: jest.fn(),
    activeCount: 0, isFiltered: false,
  });
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  mockParseViewType.mockReturnValue("board");
  mockUseBulkUpdateTickets.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("composes search, view, display, and cycle status in one shared responsive toolbar", () => {
  render(<CycleDetailPage projectId="1" cycleId="5" />);

  expect(screen.getAllByTestId("build-list-toolbar")).toHaveLength(1);
  const toolbar = screen.getByTestId("build-list-toolbar");
  expect(toolbar).toContainElement(screen.getByTestId("toolbar-search"));
  expect(toolbar).toContainElement(screen.getByRole("button", { name: "View" }));
  expect(toolbar).toContainElement(screen.getByRole("button", { name: "Display" }));
  expect(toolbar).toHaveTextContent("active");

  const props = mockBuildListToolbar.mock.calls.at(-1)?.[0];
  expect(props?.className).toContain("max-md:flex-col");
  expect(props?.trailing).toBeTruthy();
});

it("renders NoPermissionState when build:cycles:view is denied instead of calling notFound", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseProject.mockReturnValue(baseQueryResult());
  mockUseCycles.mockReturnValue(baseQueryResult());
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult());
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(mockNotFound).not.toHaveBeenCalled();
});

it("renders the cycle kanban when data is present and user is permitted", () => {
  render(<CycleDetailPage projectId="1" cycleId="999" />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("renders the loading skeleton when data is being fetched, not denial or empty state", () => {
  mockUseProject.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: undefined, refetch: jest.fn() });
  mockUseCycles.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: undefined, refetch: jest.fn() });
  mockUseProjectBoardTickets.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: undefined, refetch: jest.fn() });
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the error state with the backend message when the cycles query fails", () => {
  mockUseCycles.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("Failed to load cycle data"),
    refetch: jest.fn(),
  });
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  const errorEl = screen.getByTestId("error-state");
  expect(errorEl.textContent).toContain("Failed to load cycle data");
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

const makeTicket = (id: number, title: string, status = "TODO") => ({
  id, title, status, ticketNumber: id, cycleId: 5, rank: "0",
  epicId: null, assigneeId: null, priority: null, points: null,
  timeSpent: null, dueDate: null, startDate: null, sequenceId: `T-${id}`,
  labels: [], assignee: null, cycle: null,
});

it("sends both the cycle scope and the debounced search term to the board read, so a matching ticket beyond the fetched page is not lost to a browser-side filter", () => {
  mockUseBuildListFilters.mockReturnValue({
    search: "alpha", debouncedSearch: "alpha", cursor: null,
    setSearch: jest.fn(), setCursor: jest.fn(), clearAll: jest.fn(),
    resetKey: "", value: jest.fn(() => ""), setValue: jest.fn(),
    activeCount: 1, isFiltered: true,
  });
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({
    data: [makeTicket(1, "Alpha sprint task")],
  }));
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  const passed = JSON.stringify(mockUseProjectBoardTickets.mock.calls.at(-1) ?? []);
  expect(passed).toContain("alpha");
  expect(passed).toContain("5");
  const calls = mockUseBuildListKeyboard.mock.calls;
  expect(calls[calls.length - 1]?.[0]?.itemCount).toBe(1);
});

it("renders every ticket the board read returned when no search term is set, so nothing is hidden client-side", () => {
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({
    data: [makeTicket(1, "Alpha sprint task"), makeTicket(2, "Beta sprint task")],
  }));
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  const calls = mockUseBuildListKeyboard.mock.calls;
  expect(calls[calls.length - 1]?.[0]?.itemCount).toBe(2);
});

it("status filter narrows cycleTickets to only the matching status, reflected in keyboard itemCount", () => {
  mockUseBuildListFilters.mockReturnValue({
    search: "", debouncedSearch: "", cursor: null,
    setSearch: jest.fn(), setCursor: jest.fn(), clearAll: jest.fn(),
    resetKey: "", value: jest.fn((k: string) => k === "status" ? "DONE" : ""),
    setValue: jest.fn(), activeCount: 1, isFiltered: true,
  });
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({
    data: [makeTicket(3, "Task A", "TODO"), makeTicket(4, "Task B", "DONE")],
  }));
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  const calls = mockUseBuildListKeyboard.mock.calls;
  const lastArgs = calls[calls.length - 1]?.[0];
  expect(lastArgs?.itemCount).toBe(1);
});

it("keyboard is disabled on board view and enabled on list view", () => {
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({ data: [makeTicket(5, "X")] }));
  mockParseViewType.mockReturnValue("board");
  const { unmount } = render(<CycleDetailPage projectId="1" cycleId="5" />);
  const boardArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
  expect(boardArgs?.enabled).toBe(false);
  unmount();
  mockParseViewType.mockReturnValue("list");
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  const listArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
  expect(listArgs?.enabled).toBe(true);
});

it("from filter narrows cycleTickets to only tickets with dueDate on or after the from value, reflected in keyboard itemCount", () => {
  mockUseBuildListFilters.mockReturnValue({
    search: "", debouncedSearch: "", cursor: null,
    setSearch: jest.fn(), setCursor: jest.fn(), clearAll: jest.fn(),
    resetKey: "", value: jest.fn((k: string) => k === "from" ? "2026-09-15" : "all"),
    setValue: jest.fn(), activeCount: 1, isFiltered: true,
  });
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({
    data: [
      { ...makeTicket(10, "Before", "TODO"), dueDate: "2026-09-10" },
      { ...makeTicket(11, "After", "TODO"), dueDate: "2026-09-20" },
    ],
  }));
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  const calls = mockUseBuildListKeyboard.mock.calls;
  const lastArgs = calls[calls.length - 1]?.[0];
  expect(lastArgs?.itemCount).toBe(1);
});

it("to filter narrows cycleTickets to only tickets with dueDate on or before the to value", () => {
  mockUseBuildListFilters.mockReturnValue({
    search: "", debouncedSearch: "", cursor: null,
    setSearch: jest.fn(), setCursor: jest.fn(), clearAll: jest.fn(),
    resetKey: "", value: jest.fn((k: string) => k === "to" ? "2026-09-15" : "all"),
    setValue: jest.fn(), activeCount: 1, isFiltered: true,
  });
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({
    data: [
      { ...makeTicket(12, "Before", "TODO"), dueDate: "2026-09-10" },
      { ...makeTicket(13, "After", "TODO"), dueDate: "2026-09-20" },
    ],
  }));
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  const calls = mockUseBuildListKeyboard.mock.calls;
  const lastArgs = calls[calls.length - 1]?.[0];
  expect(lastArgs?.itemCount).toBe(1);
});

it("selecting a list-view ticket then clicking bulk-status invokes useBulkUpdateTickets mutate with status", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ mutate: bulkMutate, isPending: false });
  mockParseViewType.mockReturnValue("list");
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({
    data: [makeTicket(20, "Ticket X")],
  }));
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  const checkbox = screen.getByRole("checkbox", { name: /select/i });
  await act(async () => { fireEvent.click(checkbox); });
  expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-status-btn")); });
  expect(bulkMutate).toHaveBeenCalledWith(
    { ticketIds: [20], status: "DONE" },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  );
});

it("selecting a list-view ticket then clicking bulk-priority invokes useBulkUpdateTickets mutate with priority", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ mutate: bulkMutate, isPending: false });
  mockParseViewType.mockReturnValue("list");
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({
    data: [makeTicket(21, "Ticket Y")],
  }));
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  const checkbox = screen.getByRole("checkbox", { name: /select/i });
  await act(async () => { fireEvent.click(checkbox); });
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-priority-btn")); });
  expect(bulkMutate).toHaveBeenCalledWith(
    { ticketIds: [21], priority: "HIGH" },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  );
});

it("passes cycleId as a filter to useTicketColumnCounts so column counts are scoped to the cycle not the whole project (BUG-057)", () => {
  render(<CycleDetailPage projectId="1" cycleId="5" />);

  const calls = mockUseTicketColumnCounts.mock.calls;
  const lastCall = calls.at(-1);
  expect(lastCall?.[0]).toBe(1);
  expect(lastCall?.[1]).toEqual(expect.objectContaining({ cycle: "5" }));
});

it("shows No matches empty state when a search is active but no tickets match so the user is not misled into thinking the cycle is empty (BUG-057)", () => {
  mockUseBuildListFilters.mockReturnValue({
    search: "alpha", debouncedSearch: "alpha", cursor: null,
    setSearch: jest.fn(), setCursor: jest.fn(), clearAll: jest.fn(),
    resetKey: "", value: jest.fn(() => ""), setValue: jest.fn(),
    activeCount: 1, isFiltered: true,
  });
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({ data: [] }));
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No matches");
});

it("shows No tickets in this cycle empty state when no search is active and the cycle has no tickets (BUG-057)", () => {
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({ data: [] }));
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No tickets in this cycle");
});

