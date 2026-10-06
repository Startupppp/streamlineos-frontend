import { render, screen } from "@testing-library/react";

export { render, screen };

export const mockRouterPush = jest.fn();

export const mockRouterReplace = jest.fn();

export const mockUseSearchParams = jest.fn(() => new URLSearchParams());

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockRouterReplace, push: mockRouterPush }),
  usePathname: () => "/build/managed-products/7/goals",
  useSearchParams: mockUseSearchParams,
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
    if (resolution.kind === "empty") return <div data-testid="page-state-empty">{empty}</div>;
    return <div data-testid="page-state-ready">{children}</div>;
  },
}));

jest.mock("@/hooks/api/feedbucket", () => ({
  useFeedbucketSubmissions: jest.fn(),
}));

jest.mock("@/hooks/api/build/intake-mutations", () => ({
  useRouteFeedbucketToIntake: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProductInsights: jest.fn(),
  useManagedProducts: jest.fn(),
  useCreateManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useBulkUpdateManagedProducts: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(() => ({ data: { data: [] } })),
}));

jest.mock("@/hooks/api/goals", () => ({
  useGoals: jest.fn(),
  useGoalsPage: jest.fn(),
  useGoalStats: jest.fn(() => ({ data: undefined })),
  useGoal: jest.fn(() => ({ data: undefined })),
  useDeleteGoal: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
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
  CONTENT_FILL_PANEL: "",
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
  StatCard: ({ label, href, value }: { label: string; href?: string; value?: number }) =>
    href ? (
      <a data-testid="stat-card-link" data-label={label} href={href}>
        {label}: {value}
      </a>
    ) : (
      <div data-testid="stat-card" data-label={label}>
        {label}: {value}
      </div>
    ),
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
    onRowClick,
    rowClassName,
  }: {
    data?: Array<{ name?: string; message?: string; id?: unknown }>;
    emptyState?: React.ReactNode;
    isLoading?: boolean;
    getRowKey?: (row: { name?: string; message?: string; id?: unknown }, i: number) => string | number;
    onRowClick?: (row: { name?: string; message?: string; id?: unknown }) => void;
    rowClassName?: (row: { name?: string; message?: string; id?: unknown }) => string;
  }) => {
    if (isLoading) return <div data-testid="data-table-loading" />;
    if (!data || data.length === 0) return emptyState ?? <div data-testid="data-table" />;
    return (
      <div data-testid="data-table">
        {data.map((row, i) => {
          const key = getRowKey ? String(getRowKey(row, i)) : String(i);
          return onRowClick ? (
            <button
              key={key}
              type="button"
              className={rowClassName?.(row)}
              onClick={() => onRowClick(row)}
            >
              {row.name ?? row.message}
            </button>
          ) : (
            <span key={key}>{row.name ?? row.message}</span>
          );
        })}
      </div>
    );
  },
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/features/build/goals/goal-form-sheet", () => ({
  GoalFormSheet: () => null,
}));

jest.mock("@/features/build/goals/constants", () => ({
  STATUS_CONFIG: {
    not_started: { label: "Not started", variant: "outline" as const },
    on_track: { label: "On track", variant: "default" as const },
    at_risk: { label: "At risk", variant: "destructive" as const },
    off_track: { label: "Off track", variant: "destructive" as const },
    completed: { label: "Completed", variant: "secondary" as const },
  },
  LEVEL_LABEL: { company: "Company", team: "Team", individual: "Individual" },
  STATUS_OPTIONS: [],
  LEVEL_OPTIONS: [],
  METRIC_OPTIONS: [],
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
  ...jest.requireActual("date-fns"),
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
  EllipsisIcon: () => <span data-testid="ellipsis-icon" />,
}));

export const { useGoals, useGoalsPage, useGoal, useDeleteGoal }: {
  useGoals: jest.Mock;
  useGoalsPage: jest.Mock;
  useGoal: jest.Mock;
  useDeleteGoal: jest.Mock;
} = jest.requireMock("@/hooks/api/goals");
export const { usePageState }: { usePageState: jest.Mock } = jest.requireMock("@/hooks/api/use-page-state");
export const { useCan }: { useCan: jest.Mock } = jest.requireMock("@/hooks/api/access");
export const { useFeedbucketSubmissions }: { useFeedbucketSubmissions: jest.Mock } = jest.requireMock("@/hooks/api/feedbucket");
export const { useManagedProductInsights }: { useManagedProductInsights: jest.Mock } = jest.requireMock("@/hooks/api/build/managed-products");
export const { useRoadmapItems }: { useRoadmapItems: jest.Mock } = jest.requireMock("@/hooks/api/build/roadmap");
export const { useManagedProducts }: { useManagedProducts: jest.Mock } = jest.requireMock("@/hooks/api/build/managed-products");

export { EMPTY_GOALS_PAGE_RESULT, EMPTY_FEEDBUCKET_RESULT, EMPTY_MANAGED_PRODUCTS_RESULT } from "./product-scope-pages.fixtures";

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(true);
  usePageState.mockReturnValue({ kind: "ready" });
});
