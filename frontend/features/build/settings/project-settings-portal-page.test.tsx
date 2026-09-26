import { render, screen } from "@testing-library/react";
import { ProjectSettingsPortalPage } from "./project-settings-portal-page";

type TicketRow = { id: number; ticketNumber: number; title: string; type: string; clientVisible: boolean };
type MilestoneRow = { id: number; name: string; clientVisible: boolean };

function makeTicketPage(tickets: TicketRow[], hasMore = false) {
  return { data: tickets, pagination: { limit: 50, hasMore, nextCursor: hasMore ? "t-cursor" : null } };
}
function makeMilestonePage(milestones: MilestoneRow[], hasMore = false) {
  return { data: milestones, pagination: { limit: 50, hasMore, nextCursor: hasMore ? "m-cursor" : null } };
}

let mockCanManage = true;
let mockVisibilityQuery: {
  data?: { tickets: ReturnType<typeof makeTicketPage>; milestones: ReturnType<typeof makeMilestonePage> };
  isLoading: boolean;
  isError: boolean;
  error?: Error;
} = {
  data: { tickets: makeTicketPage([]), milestones: makeMilestonePage([]) },
  isLoading: false,
  isError: false,
};

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanManage,
}));

jest.mock("@/hooks/api/build", () => ({
  useClientVisibility: () => ({ ...mockVisibilityQuery, refetch: jest.fn() }),
  useUpdateTicketVisibility: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateMilestoneVisibility: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({
    permission,
    isLoading,
    isError,
    isEmpty,
  }: {
    permission: string;
    isLoading: boolean;
    isError: boolean;
    isEmpty: boolean;
  }) => {
    if (permission === "build:clientvisibility:manage" && !mockCanManage) return "denied";
    if (isLoading) return "loading";
    if (isError) return "error";
    if (isEmpty) return "empty";
    return "ready";
  },
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: string;
    loading: React.ReactNode;
    empty: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution === "denied") return <div data-testid="no-permission">No permission</div>;
    if (resolution === "empty") return <div data-testid="page-empty">{empty}</div>;
    if (resolution === "error") return <div data-testid="page-error">Error</div>;
    return <div>{children}</div>;
  },
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div><h2>{title}</h2></div>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/table-pagination", () => ({
  TablePagination: () => <div data-testid="table-pagination" />,
  useCursorPager: () => ({ cursor: null, hasPrevious: false, goNext: jest.fn(), goPrevious: jest.fn() }),
}));

jest.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    "aria-label": ariaLabel,
    disabled,
  }: {
    checked: boolean;
    "aria-label": string;
    disabled?: boolean;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
    />
  ),
}));

describe("ProjectSettingsPortalPage", () => {
  beforeEach(() => {
    mockCanManage = true;
    mockVisibilityQuery = {
      data: { tickets: makeTicketPage([]), milestones: makeMilestonePage([]) },
      isLoading: false,
      isError: false,
    };
  });

  it("shows denied state when user lacks permission", () => {
    mockCanManage = false;

    render(<ProjectSettingsPortalPage projectId={10} />);

    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("renders loading state", () => {
    mockVisibilityQuery = { data: undefined, isLoading: true, isError: false };

    render(<ProjectSettingsPortalPage projectId={10} />);

    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton")).toHaveLength(2);
  });

  it("renders empty state when no tickets or milestones", () => {
    render(<ProjectSettingsPortalPage projectId={10} />);

    expect(screen.getByTestId("page-empty")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No portal content yet" })).toBeInTheDocument();
  });

  it("renders ticket list with visibility toggles", () => {
    mockVisibilityQuery = {
      data: {
        tickets: makeTicketPage([
          { id: 1, ticketNumber: 42, title: "Fix login bug", type: "bug", clientVisible: true },
          { id: 2, ticketNumber: 43, title: "Add dashboard", type: "feature", clientVisible: false },
        ]),
        milestones: makeMilestonePage([]),
      },
      isLoading: false,
      isError: false,
    };

    render(<ProjectSettingsPortalPage projectId={10} />);

    expect(screen.getByText(/#42 Fix login bug/)).toBeInTheDocument();
    expect(screen.getByText(/#43 Add dashboard/)).toBeInTheDocument();
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(2);
    expect(switches[0]).toHaveAttribute("aria-checked", "true");
    expect(switches[1]).toHaveAttribute("aria-checked", "false");
  });

  it("renders milestone list with visibility toggles", () => {
    mockVisibilityQuery = {
      data: {
        tickets: makeTicketPage([]),
        milestones: makeMilestonePage([
          { id: 5, name: "Beta release", clientVisible: true },
          { id: 6, name: "GA launch", clientVisible: false },
        ]),
      },
      isLoading: false,
      isError: false,
    };

    render(<ProjectSettingsPortalPage projectId={10} />);

    expect(screen.getByText("Beta release")).toBeInTheDocument();
    expect(screen.getByText("GA launch")).toBeInTheDocument();
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(2);
  });

  it("shows ticket pagination controls when the server reports hasMore for tickets", () => {
    const manyTickets = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      ticketNumber: i + 1,
      title: `Ticket ${i + 1}`,
      type: "task",
      clientVisible: false,
    }));
    mockVisibilityQuery = {
      data: {
        tickets: makeTicketPage(manyTickets, true),
        milestones: makeMilestonePage([]),
      },
      isLoading: false,
      isError: false,
    };

    render(<ProjectSettingsPortalPage projectId={10} />);

    expect(screen.getAllByRole("switch")).toHaveLength(50);
    expect(screen.getByTestId("table-pagination")).toBeInTheDocument();
  });
});
