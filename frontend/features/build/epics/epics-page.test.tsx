import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { EpicsPage } from "./epics-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/build/projects", () => ({ useProject: jest.fn() }));
jest.mock("@/hooks/api/build/ticket-queries", () => ({ useProjectBoardTickets: jest.fn() }));
jest.mock("@/hooks/api/build/ticket-update-mutation", () => ({ useUpdateTicket: jest.fn() }));
jest.mock("@/hooks/api/build/ticket-create-rank-mutations", () => ({
  useDeleteTicket: jest.fn(),
  useCreateTicket: jest.fn(),
  useBulkUpdateTickets: jest.fn(),
}));
jest.mock("@/hooks/api/build/labels", () => ({
  useOrgLabels: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api/build/ticket-import-export", () => ({
  useExportTickets: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/build/advanced", () => ({
  useCycles: jest.fn(),
  useEpics: jest.fn(() => ({ data: [] })),
}));
jest.mock("@/hooks/api/build/project-members", () => ({
  useProjectMembers: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: jest.fn(),
}));

let capturedToolbarFilters: { id: string }[] | undefined;

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: ({ filters }: { filters?: { id: string }[] }) => {
    capturedToolbarFilters = filters;
    return <div data-testid="build-list-toolbar" />;
  },
}));

jest.mock("@/features/build/shared/bulk-action-bar", () => ({
  BulkActionBar: ({ selectedCount }: { selectedCount: number }) => (
    <div data-testid="bulk-action-bar">{selectedCount}</div>
  ),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/features/build/shared/module-disabled-state", () => ({
  ModuleDisabledState: () => <div data-testid="module-disabled" />,
}));

jest.mock("@/features/build/shared/completed-status", () => ({
  getCompletedStatusNames: () => new Set<string>(),
}));

jest.mock("@/features/build/epics/create-epic-dialog", () => ({
  CreateEpicDialog: () => <div data-testid="create-epic-dialog" />,
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("@/features/build/epics/epic-card", () => ({
  EpicCard: ({
    dependencyCount,
    onLinkStory,
  }: {
    dependencyCount?: number;
    onLinkStory: (storyId: number, epicId: number) => void;
  }) => (
    <div data-testid="epic-card" data-dependency-count={dependencyCount ?? ""}>
      <button type="button" data-testid="link-story-btn" onClick={() => onLinkStory(31, 11)}>
        Link story
      </button>
    </div>
  ),
}));

jest.mock("@/features/build/epics/epic-story-row", () => ({
  EpicStoryRow: () => <div data-testid="epic-story-row" />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, filters }: { children: React.ReactNode; title?: string; filters?: React.ReactNode }) => (
    <div>{title ? <h1>{title}</h1> : null}{filters}{children}</div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description, error }: { description?: string; error?: unknown }) => (
    <div data-testid="error-state">
      {description}
      <span data-testid="error-reference">
        {jest.requireActual("@/lib/api-envelope").getCorrelationId(error) ?? ""}
      </span>
    </div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => <div data-testid="stat-card" />,
  StatCardGrid: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  StatCardGridSkeleton: () => <div data-testid="stat-card-grid-skeleton" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmStaggerList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CONTENT_FILL_PANEL: "",
}));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import { useProject, useProjectBoardTickets, useUpdateTicket, useDeleteTicket, useCreateTicket, useBulkUpdateTickets, useCycles } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useEpics } from "@/hooks/api/build/advanced";
import { useOnlineStatus } from "@/hooks/common/use-online-status";

const mockUseProject = useProject as jest.Mock;
const mockUseProjectBoardTickets = useProjectBoardTickets as jest.Mock;
const mockUseUpdateTicket = useUpdateTicket as jest.Mock;
const mockUseDeleteTicket = useDeleteTicket as jest.Mock;
const mockUseCreateTicket = useCreateTicket as jest.Mock;
const mockUseBulkUpdateTickets = useBulkUpdateTickets as jest.Mock;
const mockUseCycles = useCycles as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListKeyboard = useBuildListKeyboard as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;
const mockUseEpics = useEpics as jest.Mock;
const mockUseOnlineStatus = useOnlineStatus as jest.Mock;

const ACCESS_LOADING = { data: undefined, isLoading: true };
const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all", "build:tickets:view": "all", "build:tickets:create": "all" }, modules: { BUILD: true } },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: { BUILD: true } },
  isLoading: false,
};

const disabledQueryResult = () => ({ data: undefined, isLoading: false, isError: false, error: undefined, refetch: jest.fn() });

function makeMutationResult() {
  return { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProject.mockReturnValue({
    data: { id: 1, key: "TEST", statuses: [], settings: { modules: {} } },
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseProjectBoardTickets.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseUpdateTicket.mockReturnValue(makeMutationResult());
  mockUseDeleteTicket.mockReturnValue(makeMutationResult());
  mockUseCreateTicket.mockReturnValue(makeMutationResult());
  mockUseBulkUpdateTickets.mockReturnValue(makeMutationResult());
  mockUseCycles.mockReturnValue({ data: [] });
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  mockUseBuildListFilters.mockReturnValue({ search: "", debouncedSearch: "", setSearch: jest.fn(), value: jest.fn(() => "all"), isActive: jest.fn(() => false), setValue: jest.fn(), clearAll: jest.fn(), activeCount: 0, isFiltered: false });
  mockUseEpics.mockReturnValue({ data: [] });
  mockUseOnlineStatus.mockReturnValue(true);
});

const EPIC_ROW = {
  id: 11, orgId: "org-1", projectId: 1, title: "Epic Health", type: "EPIC",
  status: "TODO", priority: "MEDIUM", ticketNumber: 11, epicId: null,
  reporterId: "user-1", points: null, storyPoints: null, link: null,
  rank: "1000", parentTicketId: null, originalEstimate: null, timeSpent: null,
  startDate: null, dueDate: null, moduleId: null, cycleId: null,
  sequenceId: "TEST-11", estimate: null, health: "at_risk",
  createdAt: "2026-09-01", updatedAt: "2026-09-01", assigneeId: null,
};

function readyPage(tickets: unknown[], updatedAt = 0) {
  mockUseProjectBoardTickets.mockReturnValue({
    data: tickets,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    dataUpdatedAt: updatedAt,
  });
}

describe("EpicsPage — the health parameter reaches the rows", () => {
  it("keeps only the epics whose health matches the filter value", async () => {
    readyPage([EPIC_ROW, { ...EPIC_ROW, id: 12, title: "Epic OnTrack", health: "on_track" }]);
    mockUseBuildListFilters.mockReturnValue({
      search: "", debouncedSearch: "", setSearch: jest.fn(),
      value: (key: string) => (key === "health" ? "at_risk" : "all"),
      isActive: (key: string) => key === "health",
      setValue: jest.fn(), clearAll: jest.fn(), activeCount: 1, isFiltered: true,
    });
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getAllByTestId("epic-card")).toHaveLength(1);
  });

  it("keeps every epic when health is the sentinel, so the predicate is not always on", async () => {
    readyPage([EPIC_ROW, { ...EPIC_ROW, id: 12, title: "Epic OnTrack", health: "on_track" }]);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getAllByTestId("epic-card")).toHaveLength(2);
  });
});

describe("EpicsPage — dependencies reach the card from the epics endpoint", () => {
  it("passes the dependency count the epics endpoint projected for that epic", async () => {
    readyPage([EPIC_ROW]);
    mockUseEpics.mockReturnValue({ data: [{ id: 11, dependencyCount: 3 }] });
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("epic-card")).toHaveAttribute("data-dependency-count", "3");
  });

  it("passes no dependency count when the endpoint knows nothing about that epic, rather than inventing zero", async () => {
    readyPage([EPIC_ROW]);
    mockUseEpics.mockReturnValue({ data: [] });
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("epic-card")).toHaveAttribute("data-dependency-count", "");
  });
});

describe("EpicsPage — offline", () => {
  it("shows a dated offline state instead of a first-run empty state when the browser is offline and nothing loaded", async () => {
    mockUseOnlineStatus.mockReturnValue(false);
    readyPage([], Date.now() - 7 * 60 * 1000);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("offline-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.getByTestId("offline-freshness")).toHaveTextContent(/last updated .*7 minutes ago/i);
  });

  it("dates the loaded epics while offline, so a stale list is not read as current", async () => {
    mockUseOnlineStatus.mockReturnValue(false);
    readyPage([EPIC_ROW], Date.now() - 2 * 60 * 1000);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("offline-banner-freshness")).toHaveTextContent(/last updated .*2 minutes ago/i);
  });

  it("shows no offline banner while online, so the notice is not always on", async () => {
    readyPage([EPIC_ROW], Date.now());
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("offline-state")).not.toBeInTheDocument();
  });
});

describe("EpicsPage — the ? shortcut has a target", () => {
  it("opens the shortcut help dialog when ? fires", async () => {
    readyPage([EPIC_ROW]);
    await act(async () => { render(<EpicsPage params={params} />); });
    const calls = mockUseBuildListKeyboard.mock.calls;
    const options = calls[calls.length - 1][0];
    expect(typeof options.onShortcutHelp).toBe("function");
    act(() => { options.onShortcutHelp(); });
    expect(screen.getByRole("dialog")).toHaveTextContent(/shortcut/i);
  });

  it("keeps the shortcut help dialog closed until ? fires", async () => {
    readyPage([EPIC_ROW]);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

const params = Promise.resolve({ projectId: "1" });

it("shows skeleton not empty state while access snapshot is still in flight because queries are disabled until snapshot lands", async () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseCan.mockReturnValue(false);
  mockUseProject.mockReturnValue(disabledQueryResult());
  mockUseProjectBoardTickets.mockReturnValue(disabledQueryResult());

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("shows NoPermissionState not empty state when build:view is denied", async () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseCan.mockReturnValue(false);
  mockUseProject.mockReturnValue(disabledQueryResult());
  mockUseProjectBoardTickets.mockReturnValue(disabledQueryResult());

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the error state with the backend message on data fetch failure, not a generic fallback", async () => {
  mockUseProjectBoardTickets.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("Failed to load tickets"),
    refetch: jest.fn(),
  });

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  const errorEl = screen.getByTestId("error-state");
  expect(errorEl.textContent).toContain("Failed to load tickets");
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the empty state when there are no epics, distinguishing setup from filtered no-result", async () => {
  mockUseProjectBoardTickets.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  expect(screen.queryByTestId("epic-card")).not.toBeInTheDocument();
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("renders epic cards when epics are present and user has view access", async () => {
  const epicTicket = {
    id: 1, orgId: "org-1", projectId: 1, title: "Epic A", type: "EPIC",
    status: "TODO", priority: "MEDIUM", ticketNumber: 1, epicId: null,
    reporterId: "user-1", points: null, storyPoints: null, link: null,
    rank: "1000", parentTicketId: null, originalEstimate: null, timeSpent: null,
    startDate: null, dueDate: null, moduleId: null, cycleId: null,
    sequenceId: "PROJ-1", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
  };
  mockUseProjectBoardTickets.mockReturnValue({
    data: [epicTicket],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.getByTestId("epic-card")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("enables keyboard navigation bound to the epic count when epics are present and access is granted", async () => {
  const epicTicket = {
    id: 2, orgId: "org-1", projectId: 1, title: "Epic B", type: "EPIC",
    status: "TODO", priority: "MEDIUM", ticketNumber: 2, epicId: null,
    reporterId: "user-1", points: null, storyPoints: null, link: null,
    rank: "1001", parentTicketId: null, originalEstimate: null, timeSpent: null,
    startDate: null, dueDate: null, moduleId: null, cycleId: null,
    sequenceId: "PROJ-2", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
  };
  mockUseProjectBoardTickets.mockReturnValue({
    data: [epicTicket],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  const calls = mockUseBuildListKeyboard.mock.calls;
  const lastArgs = calls[calls.length - 1]?.[0];
  expect(lastArgs?.enabled).toBe(true);
  expect(lastArgs?.itemCount).toBe(1);
});

describe("EpicsPage — the status, ownerId and health URL parameters are declared, so they are not stripped to the sentinel", () => {
  it("declares status, ownerId and health to useBuildListFilters, because an undeclared param always reads back as all", async () => {
    await act(async () => {
      render(<EpicsPage params={params} />);
    });

    const options = mockUseBuildListFilters.mock.calls.at(-1)?.[0] as
      | { filters?: readonly { param: string }[] }
      | undefined;
    expect(options?.filters?.map((f) => f.param)).toEqual([
      "status",
      "ownerId",
      "health",
    ]);
  });

  it("renders a control for each declared filter so the parameter is reachable without hand-editing the URL", async () => {
    await act(async () => {
      render(<EpicsPage params={params} />);
    });

    const toolbarFilters = capturedToolbarFilters ?? [];
    expect(toolbarFilters.map((f) => f.id)).toEqual([
      "status",
      "ownerId",
      "health",
    ]);
  });
});

describe("EpicsPage — the c and e shortcuts have a real target", () => {
  const EPIC = {
    id: 3, orgId: "org-1", projectId: 1, title: "Epic C", type: "EPIC",
    status: "TODO", priority: "MEDIUM", ticketNumber: 3, epicId: null,
    reporterId: "user-1", points: null, storyPoints: null, link: null,
    rank: "1002", parentTicketId: null, originalEstimate: null, timeSpent: null,
    startDate: null, dueDate: null, moduleId: null, cycleId: null,
    sequenceId: "PROJ-3", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
  };

  it("passes onCreate and onEdit to useBuildListKeyboard when the caller may create and update", async () => {
    mockUseProjectBoardTickets.mockReturnValue({ data: [EPIC], isLoading: false, isError: false, error: undefined, refetch: jest.fn() });

    await act(async () => {
      render(<EpicsPage params={params} />);
    });

    const args = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(typeof args?.onCreate).toBe("function");
    expect(typeof args?.onEdit).toBe("function");
  });

  it("passes no onCreate when build:tickets:create is denied, so c cannot open a sheet the caller may not submit", async () => {
    mockUseCan.mockReturnValue(false);
    mockUseProjectBoardTickets.mockReturnValue({ data: [EPIC], isLoading: false, isError: false, error: undefined, refetch: jest.fn() });

    await act(async () => {
      render(<EpicsPage params={params} />);
    });

    const args = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(args?.onCreate).toBeUndefined();
  });
});

describe("EpicsPage — the empty state tells a first run apart from a filtered no-result", () => {
  it("offers first-run copy when nothing is filtered and the project has no epics", async () => {
    await act(async () => {
      render(<EpicsPage params={params} />);
    });

    expect(screen.getByTestId("empty-state").textContent).toBe("No epics yet");
  });

  it("says the filters excluded everything when a filter is active and no epic survives it", async () => {
    mockUseBuildListFilters.mockReturnValue({
      search: "", debouncedSearch: "zzz", setSearch: jest.fn(),
      value: jest.fn(() => "all"), isActive: jest.fn(() => false),
      setValue: jest.fn(), clearAll: jest.fn(), activeCount: 0, isFiltered: true,
    });

    await act(async () => {
      render(<EpicsPage params={params} />);
    });

    expect(screen.getByTestId("empty-state").textContent).toBe("No epics match your filters");
  });
});

describe("EpicsPage — linking a story carries the concurrency token", () => {
  it("sends the story's own version with the epic link, because the PATCH is rejected without it", async () => {
    const mutate = jest.fn();
    mockUseUpdateTicket.mockReturnValue({ ...makeMutationResult(), mutate });
    readyPage([
      EPIC_ROW,
      { ...EPIC_ROW, id: 31, title: "Loose story", type: "STORY", version: 9, epicId: null },
    ]);
    await act(async () => { render(<EpicsPage params={params} />); });
    await act(async () => { fireEvent.click(screen.getAllByTestId("link-story-btn")[0]); });
    expect(mutate).toHaveBeenCalledWith({ ticketId: 31, version: 9, epicId: 11 });
  });

  it("sends nothing when the story is not in the loaded page, rather than a patch with no token", async () => {
    const mutate = jest.fn();
    mockUseUpdateTicket.mockReturnValue({ ...makeMutationResult(), mutate });
    readyPage([EPIC_ROW]);
    await act(async () => { render(<EpicsPage params={params} />); });
    await act(async () => { fireEvent.click(screen.getAllByTestId("link-story-btn")[0]); });
    expect(mutate).not.toHaveBeenCalled();
  });
});

describe("EpicsPage — the failure surface carries the request id", () => {
  it("hands the failing error down so the request id reaches the reader rather than only the message", async () => {
    mockUseProject.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Epics unavailable", 500, "INTERNAL", { correlationId: "req-epics-7" }),
      refetch: jest.fn(),
    });
    readyPage([]);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("error-reference")).toHaveTextContent("req-epics-7");
  });

  it("shows no request id for a failure that carries none, so the reference is never invented", async () => {
    mockUseProject.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new TypeError("Failed to fetch"),
      refetch: jest.fn(),
    });
    readyPage([]);
    await act(async () => { render(<EpicsPage params={params} />); });
    expect(screen.getByTestId("error-reference")).toHaveTextContent("");
  });
});
