import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectApprovalsPage } from "./project-approvals-page";
import { ApiError } from "@/lib/api-envelope";
import { toast } from "sonner";

let mockSetDelegateTarget: ((row: unknown) => void) | undefined;

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/1/approvals",
}));

jest.mock("@/hooks/api/build/approvals", () => ({
  useProjectApprovals: jest.fn(),
  useCreateApproval: jest.fn(),
  useDecideApproval: jest.fn(),
  useUpdateApproval: jest.fn(),
  useDeleteApproval: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: null })),
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

jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  BUILD_FILTER_ALL: "all",
  useBuildListFilters: jest.fn(),
}));

jest.mock("@/features/build/shared/build-mobile-card", () => ({
  BuildMobileCard: ({ person }: { person: { user: { name?: string; email: string } | null; role: string } }) => (
    <div data-testid="mobile-approver">
      {person.user?.name ?? person.user?.email ?? "Unknown"}|{person.role}
    </div>
  ),
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

const mockDataTableOnChange = jest.fn();
jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({
    data,
    selection,
    mobileCard,
  }: {
    data: typeof approvalRow[];
    selection?: { onChange?: (ids: Set<string>) => void; selected?: Set<string | number> };
    mobileCard?: (row: typeof approvalRow) => React.ReactNode;
  }) => {
    function handleSelectRow() {
      selection?.onChange?.(new Set(["1"]));
      mockDataTableOnChange(new Set(["1"]));
    }
    function handleOpenDelegate() {
      if (data[0]) mockSetDelegateTarget?.(data[0]);
    }
    return (
    <div data-testid="data-table" data-rows={data.length} data-selected={selection?.selected?.size ?? 0}>
      <button
        type="button"
        data-testid="select-row-1"
        onClick={handleSelectRow}
      />
      <button
        type="button"
        data-testid="open-delegate"
        onClick={handleOpenDelegate}
      />
      {data[0] && mobileCard ? mobileCard(data[0]) : null}
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
  CONTENT_FILL_PANEL: "",
  PM_TOOLBAR: "",
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("./approvals-filter-bar", () => ({
  ApprovalsFilterBar: () => null,
}));

jest.mock("./approvals-toolbar", () => ({
  RequestApprovalMenuButton: () => (
    <button type="button">Request Approval</button>
  ),
  ApprovalActions: () => null,
}));

jest.mock("./approval-bulk-action-bar", () => ({
  ApprovalBulkActionBar: ({ onCancelSelected }: { onCancelSelected?: () => void; selectedCount?: number }) => (
    <button type="button" data-testid="bulk-cancel-btn" onClick={onCancelSelected} />
  ),
}));

jest.mock("./request-approval-sheet", () => ({
  RequestApprovalSheet: () => null,
}));

jest.mock("./decide-dialog", () => ({
  DecideDialog: () => null,
}));

jest.mock("./delegate-dialog", () => ({
  DelegateDialog: ({ currentApproverId }: { currentApproverId?: string }) => (
    <div data-testid="delegate-current-approver">{currentApproverId ?? "none"}</div>
  ),
}));

jest.mock("./use-approvals-columns", () => ({
  useApprovalsColumns: jest.fn((params: { setDelegateTarget: (row: unknown) => void }) => {
    mockSetDelegateTarget = params.setDelegateTarget;
    return [
      { key: "title", header: "Title", cell: (row: { title: string }) => row.title },
    ];
  }),
  APPROVALS_TABLE_HEADERS: ["Type", "Title", "Approver", "Level", "Due", "Status", "Actions"],
}));

jest.mock("./approval-status-badge", () => ({
  ApprovalStatusBadge: () => null,
}));

jest.mock("./approvals-constants", () => ({
  STATUS_OPTIONS: [],
  ENTITY_OPTIONS: [],
  DECIDABLE: new Set(),
  entityTypeLabel: (type: string) => type,
}));

import {
  useProjectApprovals,
  useCreateApproval,
  useDecideApproval,
  useUpdateApproval,
  useDeleteApproval,
} from "@/hooks/api/build/approvals";
import { useCan, useAccess } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";

const mockUseProjectApprovals = useProjectApprovals as jest.Mock;
const mockUseCreateApproval = useCreateApproval as jest.Mock;
const mockUseDecideApproval = useDecideApproval as jest.Mock;
const mockUseUpdateApproval = useUpdateApproval as jest.Mock;
const mockUseDeleteApproval = useDeleteApproval as jest.Mock;
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
  return {
    pages: [{ data: rows, pagination: { limit: 25, hasMore: false, nextCursor: null } }],
    pageParams: [undefined],
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
    isPending: false,
    cursor: null,
    setCursor: jest.fn(),
    activeCount: 0,
    ...overrides,
  };
}

const approvalRow = {
  id: 1,
  revision: 1,
  orgId: "org-1",
  projectId: 1,
  entityType: "task",
  entityId: 10,
  title: "Approve deployment",
  reason: null,
  requestedById: null,
  approverMembershipId: null,
  status: "pending",
  level: 1,
  dueAt: null,
  decisionComment: null,
  decidedAt: null,
  createdBy: null,
  deletedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSetDelegateTarget = undefined;
  mockUseCan.mockReturnValue(false);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProjectApprovals.mockReturnValue(
    baseQueryResult({ data: approvalPages([]) }),
  );
  mockUseCreateApproval.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseDecideApproval.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateApproval.mockReturnValue({ mutate: jest.fn(), mutateAsync: jest.fn(), captureOwner: () => ({ isCurrent: () => true }), isPending: false });
  mockUseDeleteApproval.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseOrgMembers.mockReturnValue({ data: undefined });
  mockUseBuildListFilters.mockReturnValue(defaultFilters());
});

const approvalMembers = [
  {
    membershipId: 11,
    userId: "requester-user",
    role: "MEMBER",
    joinedAt: "2026-01-01T00:00:00Z",
    name: "Requesting Person",
    email: "requester@example.test",
    image: null,
    totpEnabled: false,
  },
  {
    membershipId: 22,
    userId: "approver-user",
    role: "MANAGER",
    joinedAt: "2026-01-01T00:00:00Z",
    name: "Assigned Approver",
    email: "approver@example.test",
    image: null,
    totpEnabled: false,
  },
];

it("shows the assigned approver on mobile instead of the requester", () => {
  mockUseOrgMembers.mockReturnValue({ data: { data: approvalMembers } });
  mockUseProjectApprovals.mockReturnValue(
    baseQueryResult({
      data: approvalPages([
        { ...approvalRow, requestedById: "requester-user", approverMembershipId: 22 },
      ]),
    }),
  );

  render(<ProjectApprovalsPage projectId={1} />);

  expect(screen.getByTestId("mobile-approver")).toHaveTextContent("Assigned Approver|Approver");
  expect(screen.getByTestId("mobile-approver")).not.toHaveTextContent("Requesting Person");
});

it("excludes the assigned approver from delegation by resolving its membership to a user", () => {
  mockUseOrgMembers.mockReturnValue({ data: { data: approvalMembers } });
  mockUseProjectApprovals.mockReturnValue(
    baseQueryResult({
      data: approvalPages([
        { ...approvalRow, requestedById: "requester-user", approverMembershipId: 22 },
      ]),
    }),
  );

  render(<ProjectApprovalsPage projectId={1} />);
  fireEvent.click(screen.getByTestId("open-delegate"));

  expect(screen.getByTestId("delegate-current-approver")).toHaveTextContent("approver-user");
  expect(screen.getByTestId("delegate-current-approver")).not.toHaveTextContent("requester-user");
});

it("shows NoPermissionState when build:approvals:view is denied instead of the data table", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseProjectApprovals.mockReturnValue(baseQueryResult());
  render(<ProjectApprovalsPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows loading skeleton when data is in flight and does not show the data table", () => {
  mockUseProjectApprovals.mockReturnValue(baseQueryResult({ isLoading: true }));
  render(<ProjectApprovalsPage projectId={1} />);
  expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows error state when the query fails and does not show the skeleton", () => {
  mockUseProjectApprovals.mockReturnValue(
    baseQueryResult({ isError: true, error: new Error("Network failure") }),
  );
  render(<ProjectApprovalsPage projectId={1} />);
  expect(screen.getByTestId("error-state")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table-skeleton")).not.toBeInTheDocument();
});

it("surfaces the 402 upgrade path the backend sent rather than a generic error state (FE-41)", () => {
  mockUseProjectApprovals.mockReturnValue(
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
  render(<ProjectApprovalsPage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("renders the data table when rows are present and does not show the empty state", () => {
  mockUseProjectApprovals.mockReturnValue(
    baseQueryResult({ data: approvalPages([approvalRow]) }),
  );
  render(<ProjectApprovalsPage projectId={1} />);
  expect(screen.getByTestId("data-table")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows the 'No approvals yet' empty state when there are no rows and no filters are active", () => {
  mockUseProjectApprovals.mockReturnValue(
    baseQueryResult({ data: approvalPages([]) }),
  );
  render(<ProjectApprovalsPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No approvals yet");
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows 'No approvals match your filters' when filters are active and no rows match, not the baseline empty copy", () => {
  mockUseBuildListFilters.mockReturnValue(defaultFilters({ isFiltered: true }));
  mockUseProjectApprovals.mockReturnValue(
    baseQueryResult({ data: approvalPages([]) }),
  );
  render(<ProjectApprovalsPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent(
    "No approvals match your filters",
  );
  expect(screen.queryByText("No approvals yet")).not.toBeInTheDocument();
});

it("shows the data table when rows are present regardless of filter state", () => {
  mockUseBuildListFilters.mockReturnValue(defaultFilters({ isFiltered: true }));
  mockUseProjectApprovals.mockReturnValue(
    baseQueryResult({ data: approvalPages([approvalRow]) }),
  );
  render(<ProjectApprovalsPage projectId={1} />);
  expect(screen.getByTestId("data-table")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("hides the Request Approval button when build:approvals:request is denied", () => {
  mockUseCan.mockReturnValue(false);
  render(<ProjectApprovalsPage projectId={1} />);
  expect(screen.queryByRole("button", { name: /request approval/i })).not.toBeInTheDocument();
});

it("shows the Request Approval button when build:approvals:request is granted", () => {
  mockUseCan.mockReturnValue(true);
  render(<ProjectApprovalsPage projectId={1} />);
  expect(screen.getByRole("button", { name: /request approval/i })).toBeInTheDocument();
});

describe("BUG-042 — bulk cancel fires updateApproval with a numeric ID even though DataTable yields string IDs", () => {
  it("offers no bulk cancel control at all until a row is selected (negative control)", () => {
    const mutateMock = jest.fn();
    mockUseUpdateApproval.mockReturnValue({ mutate: mutateMock, isPending: false });
    mockUseCan.mockReturnValue(true);
    mockUseProjectApprovals.mockReturnValue(baseQueryResult({ data: approvalPages([approvalRow]) }));
    render(<ProjectApprovalsPage projectId={1} />);
    expect(screen.queryByTestId("bulk-cancel-btn")).not.toBeInTheDocument();
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("cancels the loaded row revision when DataTable onChange yields a string ID", async () => {
    const mutateMock = jest.fn();
    mockUseUpdateApproval.mockReturnValue({ mutateAsync: mutateMock.mockResolvedValue(approvalRow), captureOwner: () => ({ isCurrent: () => true }), isPending: false });
    mockUseCan.mockReturnValue(true);
    mockUseProjectApprovals.mockReturnValue(baseQueryResult({ data: approvalPages([approvalRow]) }));
    render(<ProjectApprovalsPage projectId={1} />);
    fireEvent.click(screen.getByTestId("select-row-1"));
    fireEvent.click(screen.getByTestId("bulk-cancel-btn"));
    await waitFor(() => expect(mutateMock).toHaveBeenCalledWith({ approvalId: 1, expectedRevision: 1, status: "cancelled" }));
  });
});

it("retains a failed project bulk selection and only clears it after a successful retry", async () => {
  const mutation = jest.fn().mockRejectedValueOnce(new ApiError("Revision changed", 409)).mockResolvedValue(approvalRow);
  mockUseCan.mockReturnValue(true);
  mockUseProjectApprovals.mockReturnValue(baseQueryResult({ data: approvalPages([approvalRow]) }));
  mockUseUpdateApproval.mockReturnValue({ mutateAsync: mutation, captureOwner: () => ({ isCurrent: () => true }) });
  render(<ProjectApprovalsPage projectId={1} />);
  fireEvent.click(screen.getByTestId("select-row-1"));
  fireEvent.click(screen.getByTestId("bulk-cancel-btn"));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(screen.getByTestId("data-table")).toHaveAttribute("data-selected", "1");
  expect(toast.success).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId("bulk-cancel-btn"));
  await waitFor(() => expect(screen.getByTestId("data-table")).toHaveAttribute("data-selected", "0"));
  expect(toast.success).toHaveBeenCalledWith("1 approval cancelled");
});
it("hides cancellation without management permission", () => {
  mockUseCan.mockImplementation((key: string) => key !== "build:approvals:manage");
  mockUseProjectApprovals.mockReturnValue(baseQueryResult({ data: approvalPages([approvalRow]) }));
  render(<ProjectApprovalsPage projectId={1} />);
  fireEvent.click(screen.getByTestId("select-row-1"));
  expect(screen.queryByTestId("bulk-cancel-btn")).not.toBeInTheDocument();
});
