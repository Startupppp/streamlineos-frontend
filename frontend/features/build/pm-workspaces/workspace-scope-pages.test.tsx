import { render, screen } from "@testing-library/react";
import { WorkspaceGoalsPage } from "./workspace-goals-page";
import { WorkspaceRoadmapPage } from "./workspace-roadmap-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/workspaces/ws-1/goals",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  usePermissionGate: jest.fn(() => ({ permission: "build:roadmap:view", allowed: false, denied: true, pending: false })),
}));

jest.mock("@/hooks/api/goals", () => ({
  useGoals: jest.fn(),
  useGoalStats: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItems: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() })),
  useDeleteRoadmapItem: jest.fn(() => ({ mutate: jest.fn() })),
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

jest.mock("@/components/shared", () => ({
  NoPermissionState: ({ permission }: { permission: string }) => (
    <div data-testid="no-permission" data-permission={permission} />
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
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
}));

const { useGoals } = jest.requireMock("@/hooks/api/goals") as { useGoals: jest.Mock };

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
});

describe("WorkspaceGoalsPage — denied state (BSN-01-027)", () => {
  it("shows NoPermissionState when useGoals access.denied is true, not an empty state", () => {
    useGoals.mockReturnValue(DENIED_GOALS_RESULT);
    render(<WorkspaceGoalsPage pmWorkspaceId="ws-1" />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes the goals permission key to NoPermissionState", () => {
    useGoals.mockReturnValue(DENIED_GOALS_RESULT);
    render(<WorkspaceGoalsPage pmWorkspaceId="ws-1" />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "build:goals:view",
    );
  });

  it("renders loading skeleton when access is pending instead of denied state", () => {
    useGoals.mockReturnValue(PENDING_GOALS_RESULT);
    render(<WorkspaceGoalsPage pmWorkspaceId="ws-1" />);
    expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
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
  const { usePermissionGate } = jest.requireMock("@/hooks/api/access") as {
    usePermissionGate: jest.Mock;
  };

  it("shows NoPermissionState when usePermissionGate returns denied for roadmap view", () => {
    usePermissionGate.mockReturnValue({
      permission: "build:roadmap:view",
      allowed: false,
      denied: true,
      pending: false,
    });
    render(<WorkspaceRoadmapPage pmWorkspaceId="ws-1" />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("does not show create button when denied (BSN-01-027)", () => {
    usePermissionGate.mockReturnValue({
      permission: "build:roadmap:view",
      allowed: false,
      denied: true,
      pending: false,
    });
    render(<WorkspaceRoadmapPage pmWorkspaceId="ws-1" />);
    expect(screen.queryByRole("button", { name: /new item/i })).not.toBeInTheDocument();
  });
});
