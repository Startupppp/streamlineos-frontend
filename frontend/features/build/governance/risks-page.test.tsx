import { render, screen } from "@testing-library/react";
import { RisksPage } from "./risks-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/1/risks",
}));

jest.mock("@/hooks/api/build/governance", () => ({
  useProjectRisks: jest.fn(),
  useProjectRiskStats: jest.fn(),
  useCreateRisk: jest.fn(),
  useUpdateRisk: jest.fn(),
  useDeleteRisk: jest.fn(),
  GOVERNANCE_PAGE_SIZE: 25,
}));

jest.mock("@/hooks/api/build/project-members", () => ({
  useProjectMembers: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  BUILD_FILTER_ALL: "all",
  useBuildListFilters: jest.fn(),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
    actions,
  }: {
    children: React.ReactNode;
    title?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions ? <div data-testid="page-actions">{actions}</div> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table" data-rows={data.length} />
  ),
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CONTENT_FILL_PANEL: "",
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/features/build/shared/use-build-cursor-pager", () => ({
  useBuildCursorPager: jest.fn(() => ({
    cursor: undefined,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
  })),
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid="stat-card">{label}: {value}</div>
  ),
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("./risk-form-sheet", () => ({ RiskFormSheet: () => null }));
jest.mock("./risk-matrix", () => ({ RiskMatrix: () => null }));
jest.mock("./risk-bulk-action-bar", () => ({ RiskBulkActionBar: () => null }));
jest.mock("./risks-table-columns", () => ({
  RISK_TABLE_HEADERS: ["Title", "Status", "Owner", "Actions"],
  buildRiskColumns: jest.fn(() => []),
  RiskMobileCard: () => null,
}));

import {
  useProjectRisks,
  useProjectRiskStats,
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
} from "@/hooks/api/build/governance";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { GOVERNANCE_RISK_ROWS } from "@/features/build/shared/build-list-fixtures";

const mockUseProjectRisks = useProjectRisks as jest.Mock;
const mockUseProjectRiskStats = useProjectRiskStats as jest.Mock;
const mockUseCreateRisk = useCreateRisk as jest.Mock;
const mockUseUpdateRisk = useUpdateRisk as jest.Mock;
const mockUseDeleteRisk = useDeleteRisk as jest.Mock;
const mockUseProjectMembers = useProjectMembers as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:risks:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function baseQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

function riskPage(rows: unknown[]) {
  return { data: rows, hasMore: false, nextCursor: null };
}

function defaultFilters(overrides: Record<string, unknown> = {}) {
  return {
    value: jest.fn(() => "all"),
    isActive: jest.fn(() => false),
    setValue: jest.fn(),
    clearAll: jest.fn(),
    isFiltered: false,
    resetKey: "0",
    search: "",
    debouncedSearch: "",
    setSearch: jest.fn(),
    ...overrides,
  };
}

const riskRow = {
  id: 1,
  projectId: 1,
  riskNumber: 1,
  title: "Integration failure",
  status: "open",
  probability: "high",
  impact: "high",
  ownerId: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

beforeEach(() => {
  mockUseCan.mockReturnValue(false);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProjectRisks.mockReturnValue(baseQueryResult({ data: riskPage([]) }));
  mockUseProjectRiskStats.mockReturnValue(baseQueryResult({ data: { open: 0, highCritical: 0, closed: 0, matrix: [] } }));
  mockUseCreateRisk.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateRisk.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseDeleteRisk.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseProjectMembers.mockReturnValue({ data: [] });
  mockUseBuildListFilters.mockReturnValue(defaultFilters());
});

it("shows NoPermissionState when build:risks:view is denied and not the data table", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseProjectRisks.mockReturnValue(baseQueryResult());
  render(<RisksPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows loading skeleton when data is in flight and not the data table", () => {
  mockUseProjectRisks.mockReturnValue(baseQueryResult({ isLoading: true }));
  render(<RisksPage projectId={1} />);
  expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows error state when the query fails and not the skeleton", () => {
  mockUseProjectRisks.mockReturnValue(
    baseQueryResult({ isError: true, error: new Error("Network error") }),
  );
  render(<RisksPage projectId={1} />);
  expect(screen.getByTestId("error-state")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table-skeleton")).not.toBeInTheDocument();
});

it("surfaces the 402 upgrade path from the backend rather than a generic error state (FE-41)", () => {
  mockUseProjectRisks.mockReturnValue(
    baseQueryResult({
      isError: true,
      error: new ApiError(
        "Build is not included in your current plan.",
        402,
        "MODULE_NOT_ENABLED",
        { moduleKey: "build", reason: "not-in-plan", upgradePath: "/settings/billing" },
      ),
    }),
  );
  render(<RisksPage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("renders the data table when rows are present and not the empty state", () => {
  mockUseProjectRisks.mockReturnValue(
    baseQueryResult({ data: riskPage(GOVERNANCE_RISK_ROWS) }),
  );
  render(<RisksPage projectId={1} />);
  expect(screen.getByTestId("data-table")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows 'No risks logged' empty state when there are no rows and no filters are active", () => {
  render(<RisksPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No risks logged");
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows 'No risks match your filters' when filters are active and no rows match", () => {
  mockUseBuildListFilters.mockReturnValue(defaultFilters({ isFiltered: true }));
  render(<RisksPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No risks match your filters");
  expect(screen.queryByText("No risks logged")).not.toBeInTheDocument();
});

it("hides the New Risk button when build:risks:manage is denied", () => {
  mockUseCan.mockReturnValue(false);
  render(<RisksPage projectId={1} />);
  expect(screen.queryByRole("button", { name: /new risk/i })).not.toBeInTheDocument();
});

it("shows the New Risk button when build:risks:manage is granted", () => {
  mockUseCan.mockReturnValue(true);
  render(<RisksPage projectId={1} />);
  expect(screen.getAllByRole("button", { name: /new risk/i }).length).toBeGreaterThan(0);
});
