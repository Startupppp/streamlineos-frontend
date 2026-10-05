import React from "react";
import { render, screen } from "@testing-library/react";
import { DecisionsPage } from "./decisions-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/1/decisions",
}));

jest.mock("@/hooks/api/build/governance", () => ({
  useProjectDecisions: jest.fn(),
  useCreateDecision: jest.fn(),
  useUpdateDecision: jest.fn(),
  useDeleteDecision: jest.fn(),
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

jest.mock("@/features/build/shared/use-build-cursor-pager", () => ({
  useBuildCursorPager: jest.fn(() => ({
    cursor: undefined,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
  })),
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
  PageWrapper: ({
    children,
    actions,
  }: {
    children: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      {actions ? <div data-testid="page-actions">{actions}</div> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("./decision-form-sheet", () => ({ DecisionFormSheet: () => null }));
jest.mock("./decisions-table-columns", () => ({
  DECISION_TABLE_HEADERS: ["Title", "Status", "Owner", "Date"],
  buildDecisionColumns: jest.fn(() => []),
  DecisionMobileCard: () => null,
}));

import {
  useProjectDecisions,
  useCreateDecision,
  useUpdateDecision,
  useDeleteDecision,
} from "@/hooks/api/build/governance";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";

const mockUseProjectDecisions = useProjectDecisions as jest.Mock;
const mockUseCreateDecision = useCreateDecision as jest.Mock;
const mockUseUpdateDecision = useUpdateDecision as jest.Mock;
const mockUseDeleteDecision = useDeleteDecision as jest.Mock;
const mockUseProjectMembers = useProjectMembers as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:decisions:view": "all" }, modules: {} },
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
    ...overrides,
  };
}

function decisionsPage(rows: unknown[]) {
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

const decisionRow = {
  id: 1,
  projectId: 1,
  decisionNumber: 1,
  title: "Use PostgreSQL",
  status: "accepted",
  rationale: "Proven reliability",
  ownerId: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

beforeEach(() => {
  mockUseCan.mockReturnValue(false);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProjectDecisions.mockReturnValue(baseQueryResult({ data: decisionsPage([]) }));
  mockUseCreateDecision.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateDecision.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseDeleteDecision.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseProjectMembers.mockReturnValue({ data: [] });
  mockUseBuildListFilters.mockReturnValue(defaultFilters());
});

it("shows loading skeleton while access is loading and not error state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseProjectDecisions.mockReturnValue(baseQueryResult());
  render(<DecisionsPage projectId={1} />);
  expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});

it("shows NoPermissionState when build:decisions:view is denied and not the data table", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseProjectDecisions.mockReturnValue(baseQueryResult());
  render(<DecisionsPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows error state when the query fails and not the skeleton", () => {
  mockUseProjectDecisions.mockReturnValue(
    baseQueryResult({ isError: true, error: new Error("Network error") }),
  );
  render(<DecisionsPage projectId={1} />);
  expect(screen.getByTestId("error-state")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table-skeleton")).not.toBeInTheDocument();
});

it("surfaces the 402 upgrade path from the backend rather than a generic error state (FE-41)", () => {
  mockUseProjectDecisions.mockReturnValue(
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
  render(<DecisionsPage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("renders the data table when rows are present and not the empty state", () => {
  mockUseProjectDecisions.mockReturnValue(
    baseQueryResult({ data: decisionsPage([decisionRow]) }),
  );
  render(<DecisionsPage projectId={1} />);
  expect(screen.getByTestId("data-table")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows 'No decisions recorded' empty state when there are no rows and no active filter", () => {
  render(<DecisionsPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No decisions recorded");
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows 'No decisions match your filters' when filters are active and no rows match", () => {
  mockUseBuildListFilters.mockReturnValue(defaultFilters({ isFiltered: true }));
  render(<DecisionsPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No decisions match your filters");
  expect(screen.queryByText("No decisions recorded")).not.toBeInTheDocument();
});

it("hides the New Decision button when build:decisions:manage is denied", () => {
  mockUseCan.mockReturnValue(false);
  render(<DecisionsPage projectId={1} />);
  expect(screen.queryByRole("button", { name: /new decision/i })).not.toBeInTheDocument();
});

it("shows the New Decision button when build:decisions:manage is granted", () => {
  mockUseCan.mockReturnValue(true);
  render(<DecisionsPage projectId={1} />);
  expect(screen.getAllByRole("button", { name: /new decision/i }).length).toBeGreaterThan(0);
});

it("passes the URL-backed status filter to the decisions query so back-navigation restores the active filter without the component resetting it", () => {
  mockUseBuildListFilters.mockReturnValue(
    defaultFilters({
      value: jest.fn((param: string) => (param === "status" ? "proposed" : "all")),
    }),
  );
  render(<DecisionsPage projectId={1} />);
  expect(mockUseProjectDecisions).toHaveBeenCalledWith(
    1,
    expect.objectContaining({ status: "proposed" }),
  );
});
