"use client";

import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const mockUseApprovalInbox = jest.fn();
const mockUseCan = jest.fn();
const mockApiPatch = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockQueryClient = { invalidateQueries: mockInvalidateQueries };
const mockUseOnlineStatus = jest.fn(() => true);

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { isOrgOwner: false, scopes: { "build:approvals:view": "all", "build:approvals:decide": "all", "build:approvals:manage": "all" }, modules: {} }, isLoading: false }),
  useCan: () => mockUseCan(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build", () => ({
  useApprovalInbox: (filters: unknown) => mockUseApprovalInbox(filters),
  useDecideApproval: () => ({ mutate: jest.fn(), isPending: false }),
  useProjectApprovals: () => ({ data: undefined, isLoading: false }),
  useCreateApproval: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: () => mockQueryClient,
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: (...args: unknown[]) => mockApiPatch(...args),
    delete: jest.fn(),
  },
}));

jest.mock("@/lib/query-keys/build-work", () => ({
  buildWorkQueryKeys: {
    projects: {
      approvals: {
        inbox: (filters?: unknown) => ["approvals", "inbox", filters],
        inboxCount: () => ["approvals", "inbox", "count"],
      },
    },
  },
}));

jest.mock("@/components/ui/date-range-picker", () => ({
  DateRangePicker: ({ from, to, onChange }: { from?: string; to?: string; onChange: (r: { from: string; to: string }) => void }) => (
    <div data-testid="date-range-picker">
      <span data-testid="drp-from">{from ?? ""}</span>
      <span data-testid="drp-to">{to ?? ""}</span>
      <button
        type="button"
        data-testid="drp-trigger"
        onClick={() => onChange({ from: "2024-01-01", to: "2024-01-31" })}
      >
        Set range
      </button>
    </div>
  ),
}));

jest.mock("./approval-bulk-action-bar", () => ({
  ApprovalBulkActionBar: ({
    selectedCount,
    isPending,
    onCancelSelected,
    onClear,
  }: {
    selectedCount: number;
    isPending: boolean;
    onCancelSelected: () => void;
    onClear: () => void;
  }) =>
    selectedCount > 0 ? (
      <div data-testid="bulk-bar">
        <span data-testid="bulk-count">{selectedCount}</span>
        <button data-testid="bulk-cancel" onClick={onCancelSelected} disabled={isPending} type="button">
          Cancel selected
        </button>
        <button data-testid="bulk-clear" onClick={onClear} type="button">
          Clear
        </button>
      </div>
    ) : null,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({
    selection,
    data,
    getRowKey,
  }: {
    data?: Array<Record<string, unknown>>;
    getRowKey?: (row: Record<string, unknown>, index: number) => string | number;
    selection?: { selected: Set<string | number>; onChange: (s: Set<string | number>) => void };
  }) => (
    <div data-testid="data-table">
      <button
        type="button"
        data-testid="select-all"
        onClick={() =>
          selection?.onChange(
            new Set(
              (data ?? []).map((row, i) =>
                getRowKey ? getRowKey(row, i) : String(i),
              ),
            ),
          )
        }
      >
        Select all
      </button>
    </div>
  ),
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, filters }: { children: ReactNode; title?: string; filters?: ReactNode }) => (
    <div>
      {title && <h1>{title}</h1>}
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children, resolution }: { children: ReactNode; resolution: { kind: string } }) =>
    resolution?.kind === "ready" ? <>{children}</> : <div data-testid={`page-state-${resolution?.kind}`} />,
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: () => <div data-testid="no-permission" />,
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => null,
  StatCardGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => <div data-testid="stat-skeleton" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: ({ filters, search }: {
    filters?: Array<{ id: string; label: string; active: boolean; control: ReactNode }>;
    search?: unknown;
  }) => (
    <div data-testid="toolbar">
      {filters?.map((f) => (
        <div key={f.id} data-testid={`filter-${f.id}`}>
          {f.control}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@/features/build/shared/build-filter-select", () => ({
  BuildFilterSelect: ({ label, value, onValueChange, options }: {
    label: string;
    value: string;
    onValueChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <select data-testid={`filter-select-${label.toLowerCase()}`} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}));

jest.mock("./decide-dialog", () => ({ DecideDialog: () => null }));
jest.mock("./approvals-inbox-columns", () => ({
  INBOX_TABLE_HEADERS: [],
  buildApprovalsInboxColumns: () => [],
  ApprovalsInboxMobileCard: () => null,
}));
jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/build/approvals",
  useSearchParams: () => mockSearchParamsContainer.current,
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

const mockReplace = jest.fn();
const mockSearchParamsContainer = { current: new URLSearchParams() };

import { ApprovalsInboxPage } from "./approvals-inbox-page";

function makeInboxResult(items: unknown[] = []) {
  return {
    data: { pages: [{ data: items, pagination: { limit: 25, hasMore: false, nextCursor: null } }], pageParams: [undefined] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
  };
}

const ITEM_A = {
  id: 10,
  projectId: 1,
  projectName: "Alpha",
  projectKey: "AL",
  entityType: "task",
  entityId: 100,
  title: "Approval A",
  status: "pending",
  level: 1,
  dueAt: null,
  requestedById: null,
  decidedAt: null,
};

const ITEM_B = {
  id: 20,
  projectId: 2,
  projectName: "Beta",
  projectKey: "BT",
  entityType: "task",
  entityId: 200,
  title: "Approval B",
  status: "pending",
  level: 1,
  dueAt: null,
  requestedById: null,
  decidedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  mockUseOnlineStatus.mockReturnValue(true);
  mockSearchParamsContainer.current = new URLSearchParams();
  mockApiPatch.mockResolvedValue({ id: 10, status: "cancelled" });
});

describe("ApprovalsInboxPage — date range filter reaches API", () => {
  it("passes from and to params to useApprovalInbox when set in URL", () => {
    mockSearchParamsContainer.current = new URLSearchParams("from=2024-01-01&to=2024-01-31");
    mockUseApprovalInbox.mockReturnValue(makeInboxResult());

    render(<ApprovalsInboxPage />);

    const call = mockUseApprovalInbox.mock.calls[0]?.[0] as Record<string, string>;
    expect(call).toMatchObject({ from: "2024-01-01", to: "2024-01-31" });
  });

  it("omits from and to from useApprovalInbox when not set in URL", () => {
    mockSearchParamsContainer.current = new URLSearchParams();
    mockUseApprovalInbox.mockReturnValue(makeInboxResult());

    render(<ApprovalsInboxPage />);

    const call = mockUseApprovalInbox.mock.calls[0]?.[0] as Record<string, string | undefined>;
    expect(call?.from).toBeUndefined();
    expect(call?.to).toBeUndefined();
  });

  it("renders the date range picker filter slot in the toolbar", () => {
    mockUseApprovalInbox.mockReturnValue(makeInboxResult());

    render(<ApprovalsInboxPage />);

    expect(screen.getByTestId("filter-dateRange")).toBeInTheDocument();
    expect(screen.getByTestId("date-range-picker")).toBeInTheDocument();
  });
});

describe("ApprovalsInboxPage — bulk cancel action", () => {
  it("does not render the bulk bar when no rows are selected", () => {
    mockUseApprovalInbox.mockReturnValue(makeInboxResult([ITEM_A, ITEM_B]));

    render(<ApprovalsInboxPage />);

    expect(screen.queryByTestId("bulk-bar")).toBeNull();
  });

  it("calls apiClient.patch for each selected item on cancel and invalidates the inbox cache", async () => {
    mockUseApprovalInbox.mockReturnValue(makeInboxResult([ITEM_A, ITEM_B]));
    mockApiPatch.mockResolvedValue({ id: 10, status: "cancelled" });

    render(<ApprovalsInboxPage />);

    await act(async () => {
      screen.getByTestId("select-all").click();
    });

    expect(screen.getByTestId("bulk-bar")).toBeInTheDocument();

    await act(async () => {
      screen.getByTestId("bulk-cancel").click();
      await Promise.resolve();
    });

    expect(mockApiPatch).toHaveBeenCalledTimes(2);
    expect(mockApiPatch).toHaveBeenCalledWith(
      "/build/1/approvals/10/decide",
      { status: "cancelled" },
      undefined,
      expect.anything(),
    );
    expect(mockApiPatch).toHaveBeenCalledWith(
      "/build/2/approvals/20/decide",
      { status: "cancelled" },
      undefined,
      expect.anything(),
    );
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });
});

describe("ApprovalsInboxPage — offline banner", () => {
  it("shows offline banner when useOnlineStatus returns false", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockUseApprovalInbox.mockReturnValue(makeInboxResult());

    render(<ApprovalsInboxPage />);

    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
  });

  it("does not show offline banner when online", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockUseApprovalInbox.mockReturnValue(makeInboxResult());

    render(<ApprovalsInboxPage />);

    expect(screen.queryByText(/You're offline/)).toBeNull();
  });
});
