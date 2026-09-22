import { render, screen } from "@testing-library/react";
import { WorkspaceGoalsPage } from "./workspace-goals-page";
import { WorkspaceRoadmapPage } from "./workspace-roadmap-page";
import { PmWorkspacesPage } from "./pm-workspaces-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/workspaces/ws-1/goals",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/goals", () => ({
  useGoals: jest.fn(),
  useGoalStats: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItems: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() })),
  useDeleteRoadmapItem: jest.fn(() => ({ mutate: jest.fn() })),
}));

jest.mock("@/hooks/api/build", () => ({
  usePmWorkspaces: jest.fn(),
  useCreatePmWorkspace: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdatePmWorkspace: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeletePmWorkspace: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, empty, children }: {
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
          data-permission={resolution.kind === "denied" ? resolution.permission : undefined}
        />
      );
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    if (resolution.kind === "empty") return <>{empty ?? children}</>;
    return <>{children}</>;
  },
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters, actions }: { children: React.ReactNode; filters?: React.ReactNode; actions?: React.ReactNode }) => (
    <div>{actions}{filters}{children}</div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
  PM_PANEL: "",
  PM_TOOLBAR: "",
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => null,
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => null,
}));

jest.mock("@/features/build/goals/goal-form-sheet", () => ({
  GoalFormSheet: () => null,
}));

jest.mock("@/features/build/goals/goal-filters-popover", () => ({
  GoalLevelStatusFilters: () => null,
  GoalFiltersPopover: () => null,
}));

jest.mock("@/features/build/goals/constants", () => ({
  STATUS_CONFIG: {},
  LEVEL_LABEL: { company: "Company", team: "Team", individual: "Individual" },
  STATUS_OPTIONS: [],
  LEVEL_OPTIONS: [],
}));

jest.mock("@/features/build/roadmap/roadmap-constants", () => ({
  ROADMAP_COLUMNS: [],
}));

jest.mock("@/features/build/roadmap/roadmap-item-card", () => ({
  RoadmapItemCard: () => null,
}));

jest.mock("@/features/build/roadmap/roadmap-item-sheet", () => ({
  RoadmapItemSheet: () => null,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: () => null,
  SelectContent: () => null,
  SelectItem: () => null,
  SelectValue: () => null,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyTargetIllustration: () => null,
  EmptyProjectsIllustration: () => null,
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: () => ({ open: false, onOpenChange: jest.fn(), setOpen: jest.fn() }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
  EllipsisIcon: () => null,
}));

jest.mock("./pm-workspace-status-badge", () => ({
  PmWorkspaceStatusBadge: () => null,
}));

jest.mock("./pm-workspace-form-sheet", () => ({
  PmWorkspaceFormSheet: () => null,
}));

jest.mock("./pm-workspace-members-sheet", () => ({
  PmWorkspaceMembersSheet: () => null,
}));

const { useGoals } = jest.requireMock("@/hooks/api/goals") as { useGoals: jest.Mock };
const { usePmWorkspaces } = jest.requireMock("@/hooks/api/build") as { usePmWorkspaces: jest.Mock };
const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as { usePageState: jest.Mock };

const DENIED_GATE = { permission: "build:goals:view" as const, allowed: false, denied: true, pending: false };
const PENDING_GATE = { permission: "build:goals:view" as const, allowed: false, denied: false, pending: true };

const DENIED_GOALS_RESULT = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  access: DENIED_GATE,
};

const PENDING_GOALS_RESULT = {
  data: undefined,
  isLoading: true,
  isError: false,
  error: null,
  refetch: jest.fn(),
  access: PENDING_GATE,
};

const EMPTY_GOALS_RESULT = {
  data: [],
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  access: { permission: "build:goals:view" as const, allowed: true, denied: false, pending: false },
};

beforeEach(() => {
  jest.clearAllMocks();
  usePageState.mockReturnValue({ kind: "ready" });
});

describe("WorkspaceGoalsPage — denied state (BSN-01-027)", () => {
  it("shows denied state when usePageState returns denied, not an empty state", () => {
    useGoals.mockReturnValue(DENIED_GOALS_RESULT);
    usePageState.mockReturnValue({ kind: "denied", permission: "build:goals:view" });
    render(<WorkspaceGoalsPage pmWorkspaceId="ws-1" />);
    expect(screen.getByTestId("denied-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes the goals permission key to denied state", () => {
    useGoals.mockReturnValue(DENIED_GOALS_RESULT);
    usePageState.mockReturnValue({ kind: "denied", permission: "build:goals:view" });
    render(<WorkspaceGoalsPage pmWorkspaceId="ws-1" />);
    expect(screen.getByTestId("denied-state")).toHaveAttribute(
      "data-permission",
      "build:goals:view",
    );
  });

  it("renders loading skeleton when usePageState returns loading instead of denied state", () => {
    useGoals.mockReturnValue(PENDING_GOALS_RESULT);
    usePageState.mockReturnValue({ kind: "loading" });
    render(<WorkspaceGoalsPage pmWorkspaceId="ws-1" />);
    expect(screen.queryByTestId("denied-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes pmWorkspaceId to useGoals so the query is scope-filtered (BSN-01-021)", () => {
    useGoals.mockReturnValue(EMPTY_GOALS_RESULT);
    render(<WorkspaceGoalsPage pmWorkspaceId="ws-42" />);
    const [callParams] = useGoals.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ pmWorkspaceId: "ws-42" });
  });
});

describe("WorkspaceRoadmapPage — denied state (BSN-01-027)", () => {
  it("shows denied state when usePageState returns denied for roadmap view", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:roadmap:view" });
    render(<WorkspaceRoadmapPage pmWorkspaceId="ws-1" />);
    expect(screen.getByTestId("denied-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("does not show create button when denied (BSN-01-027)", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:roadmap:view" });
    render(<WorkspaceRoadmapPage pmWorkspaceId="ws-1" />);
    expect(screen.queryByRole("button", { name: /new item/i })).not.toBeInTheDocument();
  });
});

describe("PmWorkspacesPage — denied state (BSN-FE-D3)", () => {
  it("shows denied state when usePageState returns denied, not empty state", () => {
    usePmWorkspaces.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "denied", permission: "build:workspaces:view" });

    render(<PmWorkspacesPage />);

    expect(screen.getByTestId("denied-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes the workspaces permission key to denied state", () => {
    usePmWorkspaces.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "denied", permission: "build:workspaces:view" });

    render(<PmWorkspacesPage />);

    expect(screen.getByTestId("denied-state")).toHaveAttribute(
      "data-permission",
      "build:workspaces:view",
    );
  });

  it("shows data table when usePageState returns ready with data", () => {
    usePmWorkspaces.mockReturnValue({
      data: {
        data: [{ pmWorkspaceId: "ws-1", name: "Test Workspace", status: "active", memberCount: 1 }],
        pagination: { nextCursor: null, hasMore: false },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<PmWorkspacesPage />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.queryByTestId("denied-state")).not.toBeInTheDocument();
  });
});
