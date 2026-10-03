import React from "react";
import { render, screen } from "@testing-library/react";
import { ApprovalsInboxPage } from "./approvals-inbox-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/approvals",
}));

jest.mock("@/hooks/api/build/approvals", () => ({
  useApprovalInbox: jest.fn(),
  useDecideApproval: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { patch: jest.fn() },
}));

jest.mock("@/lib/query-keys/build-work", () => ({
  buildWorkQueryKeys: {
    projects: { approvals: { inbox: jest.fn(() => ["approvals", "inbox"]) } },
  },
}));

jest.mock("@/lib/api-envelope", () => {
  const actual = jest.requireActual("@/lib/api-envelope");
  return {
    ...actual,
    lazyContract: jest.fn(() => async () => ({})),
  };
});

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

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  BUILD_FILTER_ALL: "all",
  useBuildListFilters: jest.fn(),
}));

jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(),
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
  NoPermissionState: () => <div data-testid="no-permission" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CONTENT_FILL_PANEL: "",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => <div data-testid="stat-card" />,
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => <div data-testid="stat-card-skeleton" />,
}));

jest.mock("@/components/ui/date-range-picker", () => ({
  DateRangePicker: () => null,
}));

jest.mock("./decide-dialog", () => ({ DecideDialog: () => null }));
jest.mock("./approval-bulk-action-bar", () => ({
  ApprovalBulkActionBar: () => null,
}));
jest.mock("./approvals-inbox-columns", () => ({
  INBOX_TABLE_HEADERS: ["Title", "Type", "Status", "Due", "Actions"],
  buildApprovalsInboxColumns: jest.fn(() => []),
  ApprovalsInboxMobileCard: () => null,
}));
jest.mock("./approvals-constants", () => ({
  STATUS_OPTIONS: [
    { value: "all", label: "All statuses" },
    { value: "pending", label: "Pending" },
  ],
  ENTITY_OPTIONS: [
    { value: "all", label: "All types" },
  ],
}));

import { useApprovalInbox, useDecideApproval } from "@/hooks/api/build/approvals";
import { useCan, useAccess } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";

const mockUseApprovalInbox = useApprovalInbox as jest.Mock;
const mockUseDecideApproval = useDecideApproval as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseOrgMembers = useOrgMembers as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:approvals:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_LOADING = { data: undefined, isLoading: true };

function baseQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    ...overrides,
  };
}

function approvalPages(rows: unknown[]) {
  return { pages: [{ data: rows }] };
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

const approvalRow = {
  id: 1,
  projectId: 1,
  title: "Deploy v2.0",
  status: "pending",
  type: "release",
  requestedBy: null,
  dueAt: null,
  createdAt: "2026-09-01T00:00:00Z",
};

beforeEach(() => {
  mockUseCan.mockReturnValue(false);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseApprovalInbox.mockReturnValue(baseQueryResult({ data: approvalPages([]) }));
  mockUseDecideApproval.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseOrgMembers.mockReturnValue({ data: { data: [] } });
  mockUseBuildListFilters.mockReturnValue(defaultFilters());
});

it("shows loading skeleton while access is loading and not error state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseApprovalInbox.mockReturnValue(baseQueryResult());
  render(<ApprovalsInboxPage />);
  expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});

it("shows NoPermissionState when build:approvals:view is denied and not the data table", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseApprovalInbox.mockReturnValue(baseQueryResult());
  render(<ApprovalsInboxPage />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows error state when the query fails and not the skeleton", () => {
  mockUseApprovalInbox.mockReturnValue(
    baseQueryResult({ isError: true, error: new Error("Network error") }),
  );
  render(<ApprovalsInboxPage />);
  expect(screen.getByTestId("error-state")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table-skeleton")).not.toBeInTheDocument();
});

it("surfaces the 402 upgrade path from the backend rather than a generic error state (FE-41)", () => {
  mockUseApprovalInbox.mockReturnValue(
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
  render(<ApprovalsInboxPage />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("renders the data table when rows are present and not the empty state", () => {
  mockUseApprovalInbox.mockReturnValue(
    baseQueryResult({ data: approvalPages([approvalRow]) }),
  );
  render(<ApprovalsInboxPage />);
  expect(screen.getByTestId("data-table")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows 'No approvals waiting' empty state when there are no rows and no active filter", () => {
  render(<ApprovalsInboxPage />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No approvals waiting");
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows 'No approvals match your filters' when filters are active and no rows match", () => {
  mockUseBuildListFilters.mockReturnValue(defaultFilters({ isFiltered: true }));
  render(<ApprovalsInboxPage />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent(
    "No approvals match your filters",
  );
  expect(screen.queryByText("No approvals waiting")).not.toBeInTheDocument();
});
