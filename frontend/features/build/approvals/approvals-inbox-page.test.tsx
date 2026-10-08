import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { ApprovalsInboxPage } from "./approvals-inbox-page";
import { ApiError } from "@/lib/api-envelope";
import type { ApprovalInboxItem } from "@/types/projects";
import type { DataTableColumn } from "@/components/ui/data-table";

let mockSearchParams = new URLSearchParams();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockPager = {
  cursor: undefined as string | undefined,
  pageNumber: 1,
  hasPrevious: false,
  goNext: jest.fn(),
  goPrevious: jest.fn(),
  reset: jest.fn(),
};
let mockCapturedPagination: {
  mode: "cursor";
  pageNumber?: number;
  hasMore: boolean;
  hasPrevious?: boolean;
  onNext: () => void;
  onPrevious?: () => void;
  cursorVariant?: "paged" | "load-more";
} | undefined;
jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => "/build/approvals",
}));

jest.mock("@/hooks/api/build/approvals", () => ({
  useApprovalInboxPage: jest.fn(),
  useUpdateApproval: jest.fn(),
  useApproval: jest.fn(),
  useDecideApproval: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: jest.fn(),
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

jest.mock("@/features/build/shared/use-build-cursor-pager", () => ({
  useBuildCursorPager: jest.fn(() => mockPager),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({ data, selection, columns, pagination }: { data: ApprovalInboxItem[]; columns: DataTableColumn<ApprovalInboxItem>[]; selection?: { selected: Set<string | number>; onChange: (ids: Set<string | number>) => void }; pagination?: typeof mockCapturedPagination }) => {
    mockCapturedPagination = pagination;
    function handleSelectApprovals() {
      selection?.onChange(new Set(data.map((row) => `${row.projectId}-${row.id}`)));
    }
    return (
    <div data-testid="data-table" data-rows={data.length} data-selected={selection?.selected.size ?? 0}>
      <button onClick={handleSelectApprovals}>Select approvals</button>
      {data.map((row) => <div key={row.id}>{columns.find((column) => column.key === "actions")?.cell?.(row)}</div>)}
    </div>
    );
  },
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

jest.mock("./approval-bulk-action-bar", () => ({
  ApprovalBulkActionBar: ({ selectedCount, onCancelSelected }: { selectedCount: number; onCancelSelected: () => void }) =>
    selectedCount ? <button onClick={onCancelSelected}>Cancel selected</button> : null,
}));
jest.mock("./approvals-constants", () => ({
  ...jest.requireActual("./approvals-constants"),
  STATUS_OPTIONS: [
    { value: "all", label: "All statuses" },
    { value: "pending", label: "Pending" },
  ],
  ENTITY_OPTIONS: [
    { value: "all", label: "All types" },
  ],
}));

import { useApprovalInboxPage, useUpdateApproval } from "@/hooks/api/build/approvals";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";

const mockUseApprovalInbox = useApprovalInboxPage as jest.Mock;
const mockUseUpdateApproval = useUpdateApproval as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildMembers = useBuildMembers as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;
const mockUseBuildCursorPager = useBuildCursorPager as jest.Mock;
const { useApproval: mockUseApproval, useDecideApproval: mockUseDecideApproval } = jest.requireMock<{
  useApproval: jest.Mock<unknown, [number, number, boolean]>;
  useDecideApproval: jest.Mock;
}>("@/hooks/api/build/approvals");

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
    ...overrides,
  };
}

function approvalPages(rows: unknown[]) {
  return {
    data: rows,
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  };
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
  revision: 1,
  projectId: 1,
  title: "Deploy v2.0",
  status: "pending",
  type: "release",
  requestedBy: null,
  dueAt: null,
  createdAt: "2026-09-01T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  mockPager.cursor = undefined;
  mockPager.pageNumber = 1;
  mockPager.hasPrevious = false;
  mockCapturedPagination = undefined;
  mockUseCan.mockReturnValue(false);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseApprovalInbox.mockReturnValue(baseQueryResult({ data: approvalPages([]) }));
  mockUseUpdateApproval.mockReturnValue({ mutate: jest.fn(), mutateAsync: jest.fn(), captureOwner: () => ({ isCurrent: () => true }), isPending: false });
  mockUseBuildMembers.mockReturnValue({ data: { data: [] } });
  mockUseBuildListFilters.mockReturnValue(defaultFilters());
  mockUseApproval.mockReturnValue({ data: undefined, isPending: false, error: null, ownerStamp: null, refetch: jest.fn() });
  mockUseDecideApproval.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
});

it("renders a single cursor page with previous and next controls", () => {
  mockPager.cursor = "cursor-2";
  mockPager.pageNumber = 2;
  mockPager.hasPrevious = true;
  mockUseApprovalInbox.mockReturnValue(baseQueryResult({
    data: {
      data: [approvalRow],
      pagination: { limit: 25, hasMore: true, nextCursor: "cursor-3" },
    },
  }));

  render(<ApprovalsInboxPage />);

  expect(mockUseApprovalInbox).toHaveBeenCalledWith(expect.any(Object), "cursor-2");
  expect(mockUseBuildCursorPager).toHaveBeenCalledWith("0", "approvalInboxCursors");
  expect(mockCapturedPagination).toMatchObject({
    mode: "cursor",
    pageNumber: 2,
    hasPrevious: true,
    hasMore: true,
  });
  expect(mockCapturedPagination?.cursorVariant).toBeUndefined();
  act(() => {
    mockCapturedPagination?.onNext();
    mockCapturedPagination?.onPrevious?.();
  });
  expect(mockPager.goNext).toHaveBeenCalledWith("cursor-3");
  expect(mockPager.goPrevious).toHaveBeenCalledTimes(1);
});

it.each([[42, 7], [2_147_483_647, 2_147_483_647]])("opens fresh project %s approval %s outside the loaded queue", (projectId, approvalId) => {
  mockSearchParams = new URLSearchParams(`status=pending&cursor=retained&projectId=${projectId}&approvalId=${approvalId}`);
  mockUseCan.mockReturnValue(true);
  render(<ApprovalsInboxPage />);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(mockUseApproval).toHaveBeenCalledWith(projectId, approvalId, true);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No approvals waiting");
});

it.each(["projectId=42", "approvalId=7", "projectId=0&approvalId=7", "projectId=42&approvalId=-1",
  "projectId=42&approvalId=2147483648", "projectId=2147483648&approvalId=7", "projectId=42&approvalId=7.5",
  "projectId=42&approvalId=1e3", "projectId=42&approvalId=07", "projectId=42&approvalId=%207",
  "projectId=42&approvalId=7&approvalId=8", "projectId=42&projectId=43&approvalId=7"])(
  "does not activate a detail read for malformed or incomplete selection %s", (query) => {
    mockSearchParams = new URLSearchParams(query);
    mockUseCan.mockReturnValue(true);
    render(<ApprovalsInboxPage />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockUseApproval.mock.calls.filter((call) => call[2])).toHaveLength(0);
  },
);

it("reconstructs selection from refreshed and backward/forward route values", () => {
  mockSearchParams = new URLSearchParams("projectId=42&approvalId=7&cursor=retained");
  mockUseCan.mockReturnValue(true);
  const view = render(<ApprovalsInboxPage />);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  mockSearchParams = new URLSearchParams("projectId=42&cursor=retained");
  view.rerender(<ApprovalsInboxPage />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  mockSearchParams = new URLSearchParams("projectId=42&approvalId=8&cursor=retained");
  view.rerender(<ApprovalsInboxPage />);
  expect(mockUseApproval).toHaveBeenLastCalledWith(42, 8, true);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

it.each(["Cancel", "Escape"])("%s closes a pending direct read without changing queue facets or scroll", async (action) => {
  mockSearchParams = new URLSearchParams("q=release&status=escalated&cursor=retained&page=3&projectId=42&approvalId=7");
  mockUseCan.mockReturnValue(true);
  mockUseApproval.mockReturnValue({ data: undefined, isPending: true, error: null, ownerStamp: "owner-1", refetch: jest.fn() });
  render(<ApprovalsInboxPage />);
  if (action === "Cancel") fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  else fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/build/approvals?q=release&status=escalated&cursor=retained&page=3&projectId=42", { scroll: false }));
});

it("pushes queue selection and returns focus to its actual Decide button after closing", async () => {
  mockSearchParams = new URLSearchParams("q=release&cursor=retained");
  mockUseCan.mockReturnValue(true);
  mockUseApprovalInbox.mockReturnValue(baseQueryResult({ data: approvalPages([approvalRow]) }));
  const view = render(<ApprovalsInboxPage />);
  const origin = screen.getByRole("button", { name: "Decide" });
  origin.focus();
  fireEvent.click(origin);
  expect(mockPush).toHaveBeenCalledWith("/build/approvals?q=release&cursor=retained&projectId=1&approvalId=1", { scroll: false });
  mockSearchParams = new URLSearchParams("q=release&cursor=retained&projectId=1&approvalId=1");
  view.rerender(<ApprovalsInboxPage />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  mockSearchParams = new URLSearchParams("q=release&cursor=retained&projectId=1");
  view.rerender(<ApprovalsInboxPage />);
  await waitFor(() => expect(origin).toHaveFocus());
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

it("cancels loaded revisions through the management hook, retaining failures and waiting for acknowledgement", async () => {
  let release: (() => void) | undefined;
  const mutation = jest.fn(({ approvalId }: { approvalId: number }) => approvalId === 1
    ? new Promise((resolve) => { release = () => resolve(approvalRow); }) : Promise.reject(new ApiError("Revision changed", 409)));
  mockUseCan.mockReturnValue(true);
  mockUseApprovalInbox.mockReturnValue(baseQueryResult({ data: approvalPages([approvalRow, { ...approvalRow, id: 2, revision: 5 }]) }));
  mockUseUpdateApproval.mockReturnValue({ mutateAsync: mutation, captureOwner: () => ({ isCurrent: () => true }) });
  render(<ApprovalsInboxPage />);
  fireEvent.click(screen.getByRole("button", { name: "Select approvals" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel selected" }));
  expect(toast.success).not.toHaveBeenCalled();
  expect(mutation).toHaveBeenNthCalledWith(1, { projectId: 1, approvalId: 1, expectedRevision: 1, status: "cancelled" });
  expect(mutation).toHaveBeenNthCalledWith(2, { projectId: 1, approvalId: 2, expectedRevision: 5, status: "cancelled" });
  await act(async () => { release?.(); });
  await waitFor(() => expect(screen.getByTestId("data-table")).toHaveAttribute("data-selected", "1"));
  expect(toast.success).toHaveBeenCalledWith("1 approval cancelled");
  expect(toast.error).toHaveBeenCalled();
});

it("does not clear selection or announce a settled bulk action after its owner changes", async () => {
  let current = true;
  let release: (() => void) | undefined;
  const mutation = jest.fn(() => new Promise((resolve) => { release = () => resolve(approvalRow); }));
  mockUseCan.mockReturnValue(true);
  mockUseApprovalInbox.mockReturnValue(baseQueryResult({ data: approvalPages([approvalRow]) }));
  mockUseUpdateApproval.mockReturnValue({ mutateAsync: mutation, captureOwner: () => ({ isCurrent: () => current }) });
  render(<ApprovalsInboxPage />);
  fireEvent.click(screen.getByRole("button", { name: "Select approvals" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel selected" }));
  current = false;
  await act(async () => { release?.(); });
  expect(toast.success).not.toHaveBeenCalled();
  expect(screen.getByTestId("data-table")).toHaveAttribute("data-selected", "1");
});

it("does not offer management cancellation to an assigned decider without manage permission", () => {
  mockUseCan.mockImplementation((key: string) => key !== "build:approvals:manage");
  mockUseApprovalInbox.mockReturnValue(baseQueryResult({ data: approvalPages([approvalRow]) }));
  render(<ApprovalsInboxPage />);
  fireEvent.click(screen.getByRole("button", { name: "Select approvals" }));
  expect(screen.queryByRole("button", { name: "Cancel selected" })).not.toBeInTheDocument();
});
