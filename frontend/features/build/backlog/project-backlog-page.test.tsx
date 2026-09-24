import React from "react";
import { render, screen } from "@testing-library/react";

const mockReplace = jest.fn();
const mockSearchParamsContainer = { current: new URLSearchParams() };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/build/1/backlog",
  useSearchParams: () => mockSearchParamsContainer.current,
  notFound: jest.fn(() => null),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
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
  DataTable: ({ data }: { data: { id: number; title: string }[] }) => (
    <div data-testid="data-table">
      {data.map((row) => (
        <span key={row.id} data-testid="data-table-row">
          {row.title}
        </span>
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

jest.mock("@/features/build/ticket-details/build-ticket-detail-url", () => ({
  buildTicketDetailUrl: jest.fn(() => null),
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
};

beforeEach(() => {
  jest.clearAllMocks();
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

describe("ProjectBacklogPage — every filter the shared bar writes is applied, not just the five it used to read", () => {
  const TICKETS = {
    data: [
      {
        id: 1,
        title: "todo-high-due-early",
        status: "TODO",
        type: "TASK",
        priority: "HIGH",
        assigneeId: "user-1",
        cycleId: 7,
        dueDate: "2026-01-10T00:00:00.000Z",
        labels: [{ id: 1, ticketId: 1, labelId: 11, createdAt: null }],
      },
      {
        id: 2,
        title: "doing-low-due-late",
        status: "IN_PROGRESS",
        type: "BUG",
        priority: "LOW",
        assigneeId: null,
        cycleId: null,
        dueDate: "2026-03-20T00:00:00.000Z",
        labels: [{ id: 2, ticketId: 2, labelId: 22, createdAt: null }],
      },
      {
        id: 3,
        title: "done-urgent-no-due",
        status: "DONE",
        type: "TASK",
        priority: "URGENT",
        assigneeId: "user-9",
        cycleId: 7,
        dueDate: null,
        labels: [],
      },
    ],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  };

  function renderWith(query: string) {
    mockSearchParamsContainer.current = new URLSearchParams(query);
    mockUseProjectBoardTickets.mockReturnValue(TICKETS);
    renderPage();
    return screen
      .getAllByTestId("data-table-row")
      .map((node) => node.textContent);
  }

  it("matches either value of a two-value status filter instead of comparing against the comma-joined string", () => {
    expect(renderWith("status=TODO,DONE")).toEqual([
      "todo-high-due-early",
      "done-urgent-no-due",
    ]);
  });

  it("matches either value of a two-value priority filter", () => {
    expect(renderWith("priority=HIGH,URGENT")).toEqual([
      "todo-high-due-early",
      "done-urgent-no-due",
    ]);
  });

  it("matches either value of a two-value type filter", () => {
    expect(renderWith("type=TASK,BUG")).toHaveLength(3);
  });

  it("narrows the table for a due-date range rather than rendering a chip over an unfiltered table", () => {
    expect(renderWith("dueDateFrom=2026-01-01&dueDateTo=2026-02-01")).toEqual([
      "todo-high-due-early",
    ]);
  });

  it("narrows the table for a label filter", () => {
    expect(renderWith("labels=22")).toEqual(["doing-low-due-late"]);
  });

  it("narrows the table for a cycle filter", () => {
    expect(renderWith("cycle=7")).toEqual([
      "todo-high-due-early",
      "done-urgent-no-due",
    ]);
  });

  it("resolves the @me assignee sentinel against the signed-in user instead of dropping every row", () => {
    expect(renderWith("assigneeId=@me")).toEqual(["todo-high-due-early"]);
  });

  it("treats a multi-value assignee filter as a union rather than letting __unassigned__ swallow the other picks", () => {
    expect(renderWith("assigneeId=__unassigned__,user-9")).toEqual([
      "doing-low-due-late",
      "done-urgent-no-due",
    ]);
  });
});
