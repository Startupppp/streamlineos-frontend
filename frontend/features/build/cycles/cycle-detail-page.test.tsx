import { act, fireEvent, render, screen } from "@testing-library/react";
import { CycleDetailPage } from "./cycle-detail-page";

jest.mock("@/hooks/api", () => ({
  useProject: jest.fn(),
}));

jest.mock("@/hooks/api/build", () => ({
  useCycles: jest.fn(),
  useProjectBoardTickets: jest.fn(),
  useBulkUpdateTickets: jest.fn(),
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
  BuildListToolbar: () => <div data-testid="build-list-toolbar" />,
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
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
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
  ViewSwitcher: () => null,
  parseViewType: jest.fn(() => "board"),
}));

jest.mock("@/features/build/views/display-options-panel", () => ({
  DisplayOptionsPanel: () => null,
  DEFAULT_DISPLAY_OPTIONS: { groupBy: "none", rowBy: "none", showEmptyColumns: false, showEmptyRows: false },
}));

jest.mock("@/features/build/ticket-details/build-ticket-detail-url", () => ({
  buildTicketDetailUrl: jest.fn(() => null),
}));

import { useProject } from "@/hooks/api";
import { useCycles, useProjectBoardTickets, useBulkUpdateTickets } from "@/hooks/api/build";
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

it("search filter narrows cycleTickets and keyboard receives the reduced itemCount", () => {
  mockUseBuildListFilters.mockReturnValue({
    search: "alpha", debouncedSearch: "alpha", cursor: null,
    setSearch: jest.fn(), setCursor: jest.fn(), clearAll: jest.fn(),
    resetKey: "", value: jest.fn(() => ""), setValue: jest.fn(),
    activeCount: 1, isFiltered: true,
  });
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({
    data: [makeTicket(1, "Alpha sprint task"), makeTicket(2, "Beta sprint task")],
  }));
  render(<CycleDetailPage projectId="1" cycleId="5" />);
  const calls = mockUseBuildListKeyboard.mock.calls;
  const lastArgs = calls[calls.length - 1]?.[0];
  expect(lastArgs?.itemCount).toBe(1);
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

