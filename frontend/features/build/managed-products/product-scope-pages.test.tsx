import { render, screen } from "@testing-library/react";
import { ProductGoalsPage } from "./product-goals-page";
import { ProductRoadmapPage } from "./product-roadmap-page";
import { ProductFeedbackPage } from "./product-feedback-page";
import { ProductInsightsPage } from "./product-insights-page";
import { ManagedProductsPage } from "./managed-products-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/managed-products/7/goals",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  usePermissionGate: jest.fn(() => ({
    permission: "build:roadmap:view",
    allowed: true,
    denied: false,
    pending: false,
  })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
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
    if (resolution.kind === "loading") return <div data-testid="page-state-loading">{loading}</div>;
    if (resolution.kind === "denied")
      return (
        <div
          data-testid="no-permission"
          data-permission={resolution.permission ?? ""}
        />
      );
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    if (resolution.kind === "empty") return <div data-testid="empty-state">{empty}</div>;
    return <div data-testid="page-state-ready">{children}</div>;
  },
}));

jest.mock("@/hooks/api/feedbucket", () => ({
  useFeedbucketSubmissions: jest.fn(),
}));

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProductInsights: jest.fn(),
}));

jest.mock("@/hooks/api/build", () => ({
  useManagedProducts: jest.fn(),
  useCreateManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(() => ({ data: { data: [] } })),
}));

jest.mock("@/hooks/api/goals", () => ({
  useGoals: jest.fn(),
  useGoalStats: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItems: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
  useDeleteRoadmapItem: jest.fn(() => ({ mutate: jest.fn() })),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    filters,
    actions,
  }: {
    children: React.ReactNode;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      {actions}
      {filters}
      {children}
    </div>
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
  StatCardGridSkeleton: () => <div data-testid="stat-card-grid-skeleton" />,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => null,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({
    data,
    emptyState,
    isLoading,
    getRowKey,
  }: {
    data?: Array<{ name?: string; id?: unknown }>;
    emptyState?: React.ReactNode;
    isLoading?: boolean;
    getRowKey?: (row: { name?: string; id?: unknown }, i: number) => string | number;
  }) => {
    if (isLoading) return <div data-testid="data-table-loading" />;
    if (!data || data.length === 0) return emptyState ?? <div data-testid="data-table" />;
    return (
      <div data-testid="data-table">
        {data.map((row, i) => (
          <span key={getRowKey ? String(getRowKey(row, i)) : i}>{row.name}</span>
        ))}
      </div>
    );
  },
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/features/build/goals/goal-form-sheet", () => ({
  GoalFormSheet: () => null,
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
  EmptyInboxIllustration: () => null,
}));

jest.mock("@/lib/utils", () => ({
  resolveImageUrl: (url: string) => url,
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("date-fns", () => ({
  formatDistanceToNow: () => "2 days ago",
  format: () => "Jan 1, 2025",
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

const { useGoals } = jest.requireMock("@/hooks/api/goals") as {
  useGoals: jest.Mock;
};
const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};

const EMPTY_GOALS_RESULT = {
  data: [],
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

const EMPTY_FEEDBUCKET_RESULT = {
  data: { data: [], total: 0 },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

const EMPTY_MANAGED_PRODUCTS_RESULT = {
  data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 20 } },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  usePageState.mockReturnValue({ kind: "ready" });
});

describe("ProductGoalsPage — usePageState integration (BSN-01-027)", () => {
  it("calls usePageState with build:goals:view permission so 402 errors get classified correctly", () => {
    useGoals.mockReturnValue(EMPTY_GOALS_RESULT);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:goals:view" }),
    );
  });

  it("shows NoPermissionState when usePageState resolution is denied", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:goals:view" });
    useGoals.mockReturnValue(EMPTY_GOALS_RESULT);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes build:goals:view as the permission key in denied resolution (BSN-01-027)", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:goals:view" });
    useGoals.mockReturnValue(EMPTY_GOALS_RESULT);
    render(<ProductGoalsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "build:goals:view",
    );
  });

  it("passes managedProductId to useGoals so the query is product-scope-filtered (BSN-01-022)", () => {
    useGoals.mockReturnValue(EMPTY_GOALS_RESULT);
    render(<ProductGoalsPage managedProductId={7} />);
    const [callParams] = useGoals.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ managedProductId: 7 });
  });
});

describe("ProductRoadmapPage — usePageState integration (BSN-01-027)", () => {
  const { useRoadmapItems } = jest.requireMock("@/hooks/api/build/roadmap") as {
    useRoadmapItems: jest.Mock;
  };

  it("calls usePageState with build:roadmap:view permission so 402 errors get classified correctly", () => {
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:roadmap:view" }),
    );
  });

  it("shows NoPermissionState when usePageState resolution is denied for roadmap view", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:roadmap:view" });
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("does not show create button when denied (BSN-01-027)", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:roadmap:view" });
    render(<ProductRoadmapPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: /new item/i })).not.toBeInTheDocument();
  });

  it("passes managedProductId to useRoadmapItems so the query is product-scoped", () => {
    render(<ProductRoadmapPage managedProductId={7} />);
    const [callParams] = useRoadmapItems.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ managedProductId: 7 });
  });
});

describe("ProductFeedbackPage — usePageState integration (BSN-01-012)", () => {
  const { useFeedbucketSubmissions } = jest.requireMock("@/hooks/api/feedbucket") as {
    useFeedbucketSubmissions: jest.Mock;
  };

  it("calls usePageState with feedbucket:submissions:view permission so 402 errors get classified correctly", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "feedbucket:submissions:view" }),
    );
  });

  it("shows NoPermissionState when feedbucket:submissions:view is denied", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "feedbucket:submissions:view" });
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes feedbucket:submissions:view as the permission key in denied resolution (BSN-01-012)", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "feedbucket:submissions:view" });
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "feedbucket:submissions:view",
    );
  });

  it("passes managedProductId to useFeedbucketSubmissions so the query is product-scope-filtered (BSN-01-012)", () => {
    useFeedbucketSubmissions.mockReturnValue(EMPTY_FEEDBUCKET_RESULT);
    render(<ProductFeedbackPage managedProductId={7} />);
    const [callParams] = useFeedbucketSubmissions.mock.calls[0] as [Record<string, unknown>];
    expect(callParams).toMatchObject({ managedProductId: 7 });
  });
});

describe("ProductInsightsPage — usePageState integration (BSN-01-022)", () => {
  const { useManagedProductInsights } = jest.requireMock(
    "@/hooks/api/build/managed-products",
  ) as { useManagedProductInsights: jest.Mock };

  beforeEach(() => {
    useManagedProductInsights.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("calls usePageState with build:managed-products:view permission so 402 errors get classified correctly", () => {
    render(<ProductInsightsPage managedProductId={7} />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:managed-products:view" }),
    );
  });

  it("shows NoPermissionState when build:managed-products:view is denied", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });

  it("passes build:managed-products:view as the permission key in denied resolution", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "build:managed-products:view",
    );
  });
});

describe("ManagedProductsPage — usePageState integration (BSN-01-027)", () => {
  const { useManagedProducts } = jest.requireMock("@/hooks/api/build") as {
    useManagedProducts: jest.Mock;
  };

  beforeEach(() => {
    useManagedProducts.mockReturnValue(EMPTY_MANAGED_PRODUCTS_RESULT);
  });

  it("calls usePageState with build:managed-products:view permission so 402 errors get classified correctly", () => {
    render(<ManagedProductsPage />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:managed-products:view" }),
    );
  });

  it("shows NoPermissionState when build:managed-products:view is denied", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ManagedProductsPage />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes build:managed-products:view as the permission key in denied resolution", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ManagedProductsPage />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "build:managed-products:view",
    );
  });

  it("displays hook data without additional client-side filtering (BSN-FE-MP-001)", () => {
    const products = [
      { id: 1, name: "Alpha Service", key: "ALPHA-001", status: "active", ownerId: null, description: null, orgId: "org-1", vision: null, missionStatement: null, targetCustomer: null, differentiators: null, currentPhase: null, targetLaunchDate: null, successMetrics: null, ownerMembershipId: null, deletedAt: null, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
      { id: 2, name: "Beta Platform", key: "BETA-002", status: "active", ownerId: null, description: null, orgId: "org-1", vision: null, missionStatement: null, targetCustomer: null, differentiators: null, currentPhase: null, targetLaunchDate: null, successMetrics: null, ownerMembershipId: null, deletedAt: null, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
    ];
    useManagedProducts.mockReturnValue({
      data: { data: products, pagination: { hasMore: false, nextCursor: null, limit: 20 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });
    render(<ManagedProductsPage />);
    expect(screen.getByText("Alpha Service")).toBeInTheDocument();
    expect(screen.getByText("Beta Platform")).toBeInTheDocument();
  });
});
