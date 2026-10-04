import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { ProjectSettingsPortalPage } from "./project-settings-portal-page";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("@/lib/api-client", () => ({ apiClient: { patch: jest.fn() } }));

type TicketRow = { id: number; ticketNumber: number; title: string; type: string; clientVisible: boolean };
type MilestoneRow = { id: number; name: string; clientVisible: boolean };

function makeTicketPage(tickets: TicketRow[], hasMore = false) {
  return { data: tickets, pagination: { limit: 50, hasMore, nextCursor: hasMore ? "t-cursor" : null } };
}
function makeMilestonePage(milestones: MilestoneRow[], hasMore = false) {
  return { data: milestones, pagination: { limit: 50, hasMore, nextCursor: hasMore ? "m-cursor" : null } };
}

let mockCanManage = true;
const mockUsePageState = jest.fn();
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
  useAccess: () => ({ data: { permissions: ["build:clientvisibility:manage"] }, refetch: jest.fn() }),
}));

const mockUseUpdateTicketVisibility = jest.fn();
jest.mock("@/hooks/api/build/client-portal", () => ({
  useClientVisibility: () => ({ ...mockVisibilityQuery, refetch: jest.fn() }),
  useUpdateTicketVisibility: (...args: [number]) => mockUseUpdateTicketVisibility(...args),
  useUpdateMilestoneVisibility: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (opts: {
    permission: string;
    isLoading: boolean;
    isError: boolean;
    isEmpty: boolean;
  }) => {
    mockUsePageState(opts);
    if (opts.permission === "build:clientvisibility:manage" && !mockCanManage) return "denied";
    if (opts.isLoading) return "loading";
    if (opts.isError) return "error";
    if (opts.isEmpty) return "empty";
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
  CONTENT_FILL_PANEL: "",
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
}));
jest.mock("@/features/build/shared/use-build-cursor-pager", () => ({
  useBuildCursorPager: () => ({ cursor: null, hasPrevious: false, goNext: jest.fn(), goPrevious: jest.fn() }),
}));

jest.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    "aria-label": ariaLabel,
    disabled,
    onCheckedChange,
  }: {
    checked: boolean;
    "aria-label": string;
    disabled?: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => {
    function handleChange() { onCheckedChange(!checked); }
    return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleChange}
    />
    );
  },
}));

describe("ProjectSettingsPortalPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdateTicketVisibility.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockCanManage = true;
    mockVisibilityQuery = {
      data: { tickets: makeTicketPage([]), milestones: makeMilestonePage([]) },
      isLoading: false,
      isError: false,
    };
  });

  it("reports a rejected Ticket toggle once through the real mutation hook", async () => {
    const ticket = { id: 7, ticketNumber: 7, title: "T7", type: "bug", clientVisible: false, version: 3 };
    mockVisibilityQuery.data = { tickets: makeTicketPage([ticket]), milestones: makeMilestonePage([]) };
    mockUseUpdateTicketVisibility.mockImplementation(
      jest.requireActual<typeof import("@/hooks/api/build/client-portal")>("@/hooks/api/build/client-portal").useUpdateTicketVisibility,
    );
    jest.mocked(apiClient.patch).mockRejectedValueOnce(new ApiError("Conflict", 409));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const ticketKey = buildWorkQueryKeys.projects.ticket(10, 7);
    qc.setQueryData(ticketKey, ticket);
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    render(<QueryClientProvider client={qc}><ProjectSettingsPortalPage projectId={10} /></QueryClientProvider>);
    const toggle = screen.getByRole("switch", { name: "Show ticket #7 from client portal" });
    fireEvent.click(toggle);
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/build/10/client-visibility/tickets/7", { clientVisible: true, version: 3 }, undefined, expect.anything(),
    );
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(qc.getQueryData(ticketKey)).toEqual(ticket);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ticketKey });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: buildWorkQueryKeys.projects.clientPortal.visibility(10) });
    expect(toast.error).toHaveBeenCalledWith("This action conflicts with existing data.");
    expect(toast.error).toHaveBeenCalledTimes(1);
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
    expect(screen.getByText("1 of 2 visible on this page")).toBeInTheDocument();
    expect(screen.getAllByText("Changes save immediately.")).toHaveLength(1);
    expect(screen.getByText("Visible to clients")).toBeInTheDocument();
    expect(screen.getByText("Internal only")).toBeInTheDocument();
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
    expect(screen.getByText("1 of 2 visible on this page")).toBeInTheDocument();
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

describe("ProjectSettingsPortalPage — permission key (Criterion 3)", () => {
  it("passes the exact backend key build:clientvisibility:manage to usePageState — asserted not assumed", () => {
    render(<ProjectSettingsPortalPage projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:clientvisibility:manage" }),
    );
  });
});
