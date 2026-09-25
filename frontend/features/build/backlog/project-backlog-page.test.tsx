import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRequestLeave = jest.fn((action: () => void) => action());
const mockSearchParamsContainer = { current: new URLSearchParams() };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => "/build/1/backlog",
  useSearchParams: () => mockSearchParamsContainer.current,
  notFound: jest.fn(() => null),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useNavigationLeave: () => mockRequestLeave,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => false),
}));

const mockUseProject = jest.fn();
const mockUseCycles = jest.fn((..._args: unknown[]) => ({ data: [] }));
jest.mock("@/hooks/api", () => ({
  useProject: (...args: unknown[]) => mockUseProject(...args),
  useCycles: (...args: unknown[]) => mockUseCycles(...args),
}));

const mockUseProjectBoardTickets = jest.fn();
jest.mock("@/hooks/api/build", () => ({
  useProjectBoardTickets: (...args: unknown[]) => mockUseProjectBoardTickets(...args),
  useBulkUpdateTickets: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

const usePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => usePageState(...args),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string; permission?: string | null };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (
      resolution.kind === "denied" ||
      resolution.kind === "module-disabled" ||
      resolution.kind === "module-denied" ||
      resolution.kind === "plan-required"
    )
      return (
        <div
          data-testid="denied-state"
          data-permission={resolution.kind === "denied" ? (resolution as { permission?: string | null }).permission : undefined}
        />
      );
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    if (resolution.kind === "empty") return <>{empty ?? children}</>;
    return <>{children}</>;
  },
}));

jest.mock("@/features/build/shared/project-load-fallback", () => ({
  ProjectLoadFallback: () => <div data-testid="project-load-fallback" />,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({
    data,
    onRowClick,
  }: {
    data: { id: number; title: string }[];
    onRowClick?: (row: { id: number; title: string }) => void;
  }) => (
    <div data-testid="data-table">
      {data.map((row) => (
        <button
          key={row.id}
          type="button"
          data-testid="data-table-row"
          onClick={() => onRowClick?.(row)}
        >
          {row.title}
        </button>
      ))}
    </div>
  ),
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

jest.mock("@/features/build/backlog/bulk-action-bar", () => ({
  BulkActionBar: () => null,
}));

jest.mock("@/features/build/tickets/create-ticket-dialog", () => ({
  CreateTicketDialog: () => null,
}));

jest.mock("@/features/build/shared/ticket-filter-bar", () => ({
  TicketFilterBar: () => null,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_TOOLBAR: "",
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

const mockBuildTicketDetailUrl = jest.fn((): string | null => null);
jest.mock("@/features/build/ticket-details/build-ticket-detail-url", () => ({
  buildTicketDetailUrl: (...args: unknown[]) => mockBuildTicketDetailUrl(...args),
}));

import { ProjectBacklogPage } from "./project-backlog-page";

const READY_PROJECT = {
  data: { id: 1, key: "TST", members: [], statuses: [] },
  isLoading: false,
  isError: false,
  error: undefined,
  refetch: jest.fn(),
};

const READY_TICKETS = {
  data: [{ id: 1, title: "T-1", status: "TODO", type: "TASK" }],
  isLoading: false,
  isError: false,
  error: undefined,
  refetch: jest.fn(),
  isTruncated: false,
  fetchNextPage: jest.fn(),
  isFetchingNextPage: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestLeave.mockImplementation((action: () => void) => action());
  mockBuildTicketDetailUrl.mockReturnValue(null);
  mockSearchParamsContainer.current = new URLSearchParams();
  usePageState.mockReturnValue({ kind: "ready" });
  mockUseProject.mockReturnValue(READY_PROJECT);
  mockUseProjectBoardTickets.mockReturnValue(READY_TICKETS);
});

function renderPage() {
  return render(<ProjectBacklogPage projectId="1" />);
}

describe("ProjectBacklogPage — usePageState inputs", () => {
  it("passes build:tickets:view as the permission key", () => {
    renderPage();
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:tickets:view" }),
    );
  });

  it("passes isLoading true when tickets query is still loading", () => {
    mockUseProjectBoardTickets.mockReturnValue({
      ...READY_TICKETS,
      data: undefined,
      isLoading: true,
    });
    renderPage();
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isLoading: true }),
    );
  });

  it("renders the loading skeleton instead of notFound when the project query is in flight", () => {
    mockUseProject.mockReturnValue({
      ...READY_PROJECT,
      data: undefined,
      isLoading: true,
    });
    renderPage();
    expect(screen.getByTestId("data-table-skeleton")).toBeDefined();
  });

  it("passes isError true and the error object when tickets query fails", () => {
    const err = new Error("network");
    mockUseProjectBoardTickets.mockReturnValue({
      ...READY_TICKETS,
      data: undefined,
      isLoading: false,
      isError: true,
      error: err,
    });
    renderPage();
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isError: true, error: err }),
    );
  });

  it("passes isEmpty true when the filtered ticket list is empty", () => {
    mockUseProjectBoardTickets.mockReturnValue({
      ...READY_TICKETS,
      data: [],
    });
    renderPage();
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isEmpty: true }),
    );
  });

  it("passes isEmpty false when tickets are present", () => {
    renderPage();
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isEmpty: false }),
    );
  });
});

describe("ProjectBacklogPage — PageState resolution rendering", () => {
  it("renders the skeleton when resolution is loading, not the data table", () => {
    usePageState.mockReturnValue({ kind: "loading" });
    renderPage();
    expect(screen.getByTestId("data-table-skeleton")).toBeDefined();
    expect(screen.queryByTestId("data-table")).toBeNull();
  });

  it("renders the data table when resolution is ready, not the skeleton", () => {
    usePageState.mockReturnValue({ kind: "ready" });
    renderPage();
    expect(screen.getByTestId("data-table")).toBeDefined();
    expect(screen.queryByTestId("data-table-skeleton")).toBeNull();
  });

  it("renders denied-state when resolution is denied, not the data table", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:tickets:view" });
    renderPage();
    expect(screen.getByTestId("denied-state")).toBeDefined();
    expect(screen.queryByTestId("data-table")).toBeNull();
  });

  it("renders error-state when resolution is error, not the data table", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("fail") });
    renderPage();
    expect(screen.getByTestId("error-state")).toBeDefined();
    expect(screen.queryByTestId("data-table")).toBeNull();
  });

  it("renders empty-state when resolution is empty, not the data table", () => {
    usePageState.mockReturnValue({ kind: "empty" });
    renderPage();
    expect(screen.getByTestId("empty-state")).toBeDefined();
    expect(screen.queryByTestId("data-table")).toBeNull();
  });
});

describe("ProjectBacklogPage — project error path", () => {
  it("renders ProjectLoadFallback when the project query errors, not PageState output", () => {
    mockUseProject.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("not found"),
      refetch: jest.fn(),
    });
    renderPage();
    expect(screen.getByTestId("project-load-fallback")).toBeDefined();
    expect(screen.queryByTestId("denied-state")).toBeNull();
    expect(screen.queryByTestId("data-table")).toBeNull();
  });

  it("renders page content when the project query succeeds, not the fallback", () => {
    renderPage();
    expect(screen.queryByTestId("project-load-fallback")).toBeNull();
    expect(screen.getByTestId("data-table")).toBeDefined();
  });
});

describe("ProjectBacklogPage — server filtering and cursor pagination", () => {
  it("forwards every shared filter to the server query", () => {
    mockSearchParamsContainer.current = new URLSearchParams(
      "q=login&status=TODO,DONE&priority=HIGH,URGENT&type=TASK,BUG&assigneeId=@me,__unassigned__&labels=11,22&cycle=7,8&dueDateFrom=2026-01-01&dueDateTo=2026-02-01",
    );

    renderPage();

    expect(mockUseProjectBoardTickets).toHaveBeenCalledWith(1, {
      q: "login",
      status: "TODO,DONE",
      priority: "HIGH,URGENT",
      type: "TASK,BUG",
      assigneeId: "@me,__unassigned__",
      labels: "11,22",
      cycle: "7,8",
      dueDateFrom: "2026-01-01",
      dueDateTo: "2026-02-01",
    });
  });

  it("renders the server page without filtering the loaded subset again", () => {
    mockSearchParamsContainer.current = new URLSearchParams("status=TODO");
    mockUseProjectBoardTickets.mockReturnValue({
      ...READY_TICKETS,
      data: [{ id: 9, title: "server-authoritative", status: "DONE", type: "TASK" }],
    });

    renderPage();

    expect(screen.getByText("server-authoritative")).toBeInTheDocument();
  });

  it("loads the next cursor page only when the user asks", async () => {
    const fetchNextPage = jest.fn();
    mockUseProjectBoardTickets.mockReturnValue({
      ...READY_TICKETS,
      isTruncated: true,
      fetchNextPage,
    });
    renderPage();
    expect(fetchNextPage).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /load more/i }));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("keeps the load-more action disabled while the next page is loading", () => {
    mockUseProjectBoardTickets.mockReturnValue({
      ...READY_TICKETS,
      isTruncated: true,
      isFetchingNextPage: true,
    });

    renderPage();

    expect(screen.getByRole("button", { name: /load more/i })).toBeDisabled();
  });
});

describe("ProjectBacklogPage — unsaved-work navigation", () => {
  it("routes a ticket row click through the shared leave guard", async () => {
    mockBuildTicketDetailUrl.mockReturnValue("/build/1/TST-1");
    let pendingNavigation: (() => void) | undefined;
    mockRequestLeave.mockImplementation((action: () => void) => {
      pendingNavigation = action;
    });

    renderPage();
    await userEvent.click(screen.getByTestId("data-table-row"));

    expect(mockRequestLeave).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();

    pendingNavigation?.();
    expect(mockPush).toHaveBeenCalledWith("/build/1/TST-1");
  });

  it("does not ask to leave when a ticket detail destination cannot be resolved", async () => {
    renderPage();

    await userEvent.click(screen.getByTestId("data-table-row"));

    expect(mockRequestLeave).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
