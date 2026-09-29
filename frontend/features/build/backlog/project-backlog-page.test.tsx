import React from "react";
import { render, screen } from "@testing-library/react";
import type { BuildListSurfaceProps } from "@/features/build/shared/build-list-surface";
import type { Ticket } from "@/types/projects";

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

const mockUseCan = jest.fn((_key: string) => false);
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

const mockUseProject = jest.fn();
jest.mock("@/hooks/api/build/projects", () => ({
  useProject: (...args: unknown[]) => mockUseProject(...args),
}));

const mockUseCycles = jest.fn((..._args: unknown[]) => ({ data: [] }));
jest.mock("@/hooks/api/build/advanced", () => ({
  useCycles: (...args: unknown[]) => mockUseCycles(...args),
}));

const mockUseProjectBoardTickets = jest.fn();
jest.mock("@/hooks/api/build/tickets", () => ({
  useProjectBoardTickets: (...args: unknown[]) => mockUseProjectBoardTickets(...args),
  useBulkUpdateTickets: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

type CapturedSurface = BuildListSurfaceProps<Ticket>;
let capturedSurface: CapturedSurface | null = null;
jest.mock("@/features/build/shared/build-list-surface", () => ({
  BuildListSurface: (props: CapturedSurface) => {
    capturedSurface = props;
    return <div data-testid="build-list-surface" />;
  },
}));

jest.mock("@/features/build/shared/bulk-action-bar", () => ({
  BulkActionBar: () => <div data-testid="bulk-action-bar" />,
}));

jest.mock("@/features/build/shared/project-load-fallback", () => ({
  ProjectLoadFallback: () => <div data-testid="project-load-fallback" />,
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
  PM_TOOLBAR: "",
}));

jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: ({
    hasNextPage,
    onLoadMore,
  }: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    onLoadMore: () => void;
    label: string;
  }) =>
    hasNextPage ? (
      <button type="button" onClick={onLoadMore} aria-label="Load more tickets">
        Load more
      </button>
    ) : null,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

const mockBuildTicketDetailUrl = jest.fn((..._args: unknown[]) => null);
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

const TICKET = { id: 1, title: "T-1", status: "TODO", type: "TASK", cycleId: null } as Ticket;

const READY_TICKETS = {
  data: [TICKET],
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
  capturedSurface = null;
  mockRequestLeave.mockImplementation((action: () => void) => action());
  mockBuildTicketDetailUrl.mockReturnValue(null);
  mockSearchParamsContainer.current = new URLSearchParams();
  mockUseProject.mockReturnValue(READY_PROJECT);
  mockUseProjectBoardTickets.mockReturnValue(READY_TICKETS);
  mockUseCan.mockReturnValue(false);
});

function renderPage() {
  return render(<ProjectBacklogPage projectId="1" />);
}

describe("ProjectBacklogPage — surface declarations", () => {
  it("passes build:tickets:view as the permission key to BuildListSurface", () => {
    renderPage();
    expect(capturedSurface?.permission).toBe("build:tickets:view");
  });

  it("passes the ticket rows from the query to BuildListSurface", () => {
    renderPage();
    expect(capturedSurface?.rows).toEqual([TICKET]);
  });

  it("passes isLoading from the tickets query to BuildListSurface", () => {
    mockUseProjectBoardTickets.mockReturnValue({
      ...READY_TICKETS,
      data: [],
      isLoading: true,
    });
    renderPage();
    expect(capturedSurface?.isLoading).toBe(true);
  });

  it("passes isError and error from the tickets query to BuildListSurface (FE-41)", () => {
    const err = new Error("network");
    mockUseProjectBoardTickets.mockReturnValue({
      ...READY_TICKETS,
      data: [],
      isLoading: false,
      isError: true,
      error: err,
    });
    renderPage();
    expect(capturedSurface?.isError).toBe(true);
    expect(capturedSurface?.error).toBe(err);
  });

  it("passes isFiltered true when the search query param is present", () => {
    mockSearchParamsContainer.current = new URLSearchParams("q=login");
    renderPage();
    expect(capturedSurface?.isFiltered).toBe(true);
  });

  it("passes isFiltered false when no filter params are present", () => {
    renderPage();
    expect(capturedSurface?.isFiltered).toBe(false);
  });

  it("provides an empty prop containing the no-tickets-yet title", () => {
    renderPage();
    const { getByText } = render(capturedSurface?.empty as React.ReactElement);
    expect(getByText("No tickets yet")).toBeDefined();
  });

  it("provides a filteredEmpty prop for the filtered-empty state", () => {
    renderPage();
    expect(capturedSurface?.filteredEmpty).toBeDefined();
  });

  it("activates the filtered-empty copy and clear-filters action", () => {
    renderPage();
    const emptyState = capturedSurface?.filteredEmpty as React.ReactElement<{
      filtersActive?: boolean;
      onClearFilters?: () => void;
    }>;
    expect(emptyState.props.filtersActive).toBe(true);
    expect(emptyState.props.onClearFilters).toEqual(expect.any(Function));
  });

  it("passes minWidth 640px to BuildListSurface", () => {
    renderPage();
    expect(capturedSurface?.minWidth).toBe("640px");
  });
});

describe("ProjectBacklogPage — project loading guard", () => {
  it("shows the skeleton while the project query is in flight, before the surface mounts", () => {
    mockUseProject.mockReturnValue({
      ...READY_PROJECT,
      data: undefined,
      isLoading: true,
    });
    renderPage();
    expect(screen.getByTestId("data-table-skeleton")).toBeDefined();
    expect(screen.queryByTestId("build-list-surface")).toBeNull();
  });

  it("mounts the surface once the project has loaded", () => {
    renderPage();
    expect(screen.getByTestId("build-list-surface")).toBeDefined();
    expect(screen.queryByTestId("data-table-skeleton")).toBeNull();
  });

  it("shows ProjectLoadFallback when the project query errors, not the surface", () => {
    mockUseProject.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("not found"),
      refetch: jest.fn(),
    });
    renderPage();
    expect(screen.getByTestId("project-load-fallback")).toBeDefined();
    expect(screen.queryByTestId("build-list-surface")).toBeNull();
  });

  it("mounts the surface when the project succeeds, not the fallback", () => {
    renderPage();
    expect(screen.queryByTestId("project-load-fallback")).toBeNull();
    expect(screen.getByTestId("build-list-surface")).toBeDefined();
  });
});

describe("ProjectBacklogPage — BulkActionBar gating", () => {
  it("hides BulkActionBar when canUpdate is false", () => {
    mockUseCan.mockReturnValue(false);
    renderPage();
    expect(screen.queryByTestId("bulk-action-bar")).toBeNull();
  });

  it("hides BulkActionBar when canUpdate is true but nothing is selected (selection.size === 0)", () => {
    mockUseCan.mockReturnValue(true);
    renderPage();
    expect(screen.queryByTestId("bulk-action-bar")).toBeNull();
  });
});

describe("ProjectBacklogPage — filter forwarding", () => {
  it("forwards filter params to the server query", () => {
    mockSearchParamsContainer.current = new URLSearchParams(
      "q=login&status=TODO,DONE&priority=HIGH&type=TASK",
    );
    renderPage();
    expect(mockUseProjectBoardTickets).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        q: "login",
        status: "TODO,DONE",
        priority: "HIGH",
        type: "TASK",
      }),
    );
  });

  it("omits undefined filter values from the server query", () => {
    renderPage();
    const callArgs = mockUseProjectBoardTickets.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(callArgs).toBeDefined();
    expect(callArgs.q).toBeUndefined();
    expect(callArgs.status).toBeUndefined();
  });

  it("sends TASK,BUG,STORY,SUBTASK as the default type filter when the user has not chosen a type, so EPICs are excluded from the server query", () => {
    renderPage();
    const callArgs = mockUseProjectBoardTickets.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(callArgs?.type).toBe("TASK,BUG,STORY,SUBTASK");
  });

  it("uses the user-selected type filter instead of the default when types are chosen", () => {
    mockSearchParamsContainer.current = new URLSearchParams("type=BUG");
    renderPage();
    const callArgs = mockUseProjectBoardTickets.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(callArgs?.type).toBe("BUG");
  });
});

describe("ProjectBacklogPage — unscheduled filter", () => {
  it("passes unscheduled: true to the server query so the SQL predicate excludes scheduled tickets before pagination, not a client-side slice", () => {
    renderPage();
    const callArgs = mockUseProjectBoardTickets.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(callArgs?.unscheduled).toBe(true);
  });
});

describe("ProjectBacklogPage — Type and Cycle columns", () => {
  it("includes a Type column in the column definitions", () => {
    renderPage();
    const columnKeys = (capturedSurface?.columns as Array<{ key: string }> | undefined)?.map(
      (c) => c.key,
    );
    expect(columnKeys).toContain("type");
  });

  it("includes a Cycle column in the column definitions", () => {
    renderPage();
    const columnKeys = (capturedSurface?.columns as Array<{ key: string }> | undefined)?.map(
      (c) => c.key,
    );
    expect(columnKeys).toContain("cycle");
  });
});
