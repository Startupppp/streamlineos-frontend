import { render, screen, fireEvent } from "@testing-library/react";
import { ChangeRequestsPage } from "./change-requests-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/1/change-requests",
}));

jest.mock("@/hooks/api/build/change-requests", () => ({
  useChangeRequests: jest.fn(),
  useDeleteChangeRequest: jest.fn(),
  useUpdateChangeRequest: jest.fn(),
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

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
    actions,
    filters,
  }: {
    children: React.ReactNode;
    title?: string;
    actions?: React.ReactNode;
    filters?: React.ReactNode;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {filters}
      {actions}
      {children}
    </div>
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

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => null,
}));

jest.mock("@/features/build/shared/build-header-actions", () => ({
  BuildHeaderActions: () => null,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({
    pagination,
    selection,
  }: {
    pagination?: { hasMore?: boolean };
    selection?: { onChange: (s: Set<string | number>) => void };
  }) => (
    <div
      data-testid="data-table"
      data-has-more={String(Boolean(pagination?.hasMore))}
      onClick={() => selection?.onChange(new Set(["7"]))}
    />
  ),
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({
    ref: _ref,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { ref?: unknown }) => (
    <span {...props} />
  ),
  EllipsisIcon: ({
    ref: _ref,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { ref?: unknown }) => (
    <span {...props} />
  ),
  Lock: ({
    ref: _ref,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { ref?: unknown }) => (
    <span {...props} />
  ),
  ShieldOff: ({
    ref: _ref,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { ref?: unknown }) => (
    <span {...props} />
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("./change-request-sheet", () => ({
  ChangeRequestSheet: () => null,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
  PM_TOOLBAR: "",
}));

jest.mock("lucide-react", () => ({
  Lock: () => <span />,
  ShieldOff: () => <span />,
  Zap: () => <span />,
  Plus: () => <span />,
  X: () => <span />,
}));

import { useChangeRequests, useDeleteChangeRequest, useUpdateChangeRequest } from "@/hooks/api/build/change-requests";
import { useCan, useAccess } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";

const mockUseBuildListKeyboard = useBuildListKeyboard as jest.Mock;

const mockUseChangeRequests = useChangeRequests as jest.Mock;
const mockUseDeleteChangeRequest = useDeleteChangeRequest as jest.Mock;
const mockUseUpdateChangeRequest = useUpdateChangeRequest as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseOrgMembers = useOrgMembers as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:changerequests:view": "all" }, modules: {} },
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

beforeEach(() => {
  mockUseCan.mockReturnValue(false);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseChangeRequests.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseDeleteChangeRequest.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateChangeRequest.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseOrgMembers.mockReturnValue(baseQueryResult({ data: { data: [] } }));
  mockUseBuildListKeyboard.mockClear();
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
});

it("renders NoPermissionState when build:changerequests:view is denied instead of empty state", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseChangeRequests.mockReturnValue(baseQueryResult());
  render(<ChangeRequestsPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("does not flash denial while the access snapshot is still in flight", () => {
  mockUseAccess.mockReturnValue({ data: undefined, isLoading: true });
  mockUseChangeRequests.mockReturnValue(baseQueryResult({ isLoading: true }));
  render(<ChangeRequestsPage projectId={1} />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("offers the upgrade path the backend sent with a 402 rather than a generic error state", () => {
  mockUseChangeRequests.mockReturnValue(
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
  render(<ChangeRequestsPage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /plan|billing|upgrade/i }),
  ).toHaveAttribute("href", "/settings/billing");
});

describe("ChangeRequestsPage — cursor page consumption", () => {
  const crRow = {
    id: 1,
    orgId: "org-1",
    projectId: 1,
    crNumber: 1,
    title: "Add feature",
    description: null,
    impact: null,
    estimateMinutes: null,
    budgetImpactCents: null,
    timelineImpactDays: null,
    status: "submitted" as const,
    requestedById: null,
    approvalOwnerId: null,
    approvalOwnerMembershipId: null,
    decisionComment: null,
    decidedAt: null,
    createdBy: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    deletedAt: null,
  };

  it("renders the data table when the cursor page contains rows", () => {
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: {
          data: [crRow],
          pagination: { hasMore: false, nextCursor: null, limit: 25 },
        },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes hasMore=true to DataTable pagination when the server reports more pages so the user can navigate forward", () => {
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: {
          data: [crRow],
          pagination: { hasMore: true, nextCursor: "cursor-xyz", limit: 25 },
        },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    expect(screen.getByTestId("data-table")).toHaveAttribute("data-has-more", "true");
  });

  it("passes hasMore=false to DataTable pagination when the page is complete so forward navigation is disabled", () => {
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: {
          data: [crRow],
          pagination: { hasMore: false, nextCursor: null, limit: 25 },
        },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    expect(screen.getByTestId("data-table")).toHaveAttribute("data-has-more", "false");
  });
});

describe("ChangeRequestsPage — keyboard shortcut wiring", () => {
  const crRow = {
    id: 7,
    orgId: "org-1",
    projectId: 1,
    crNumber: 7,
    title: "keyboard target",
    description: null,
    impact: null,
    estimateMinutes: null,
    budgetImpactCents: null,
    timelineImpactDays: null,
    status: "submitted" as const,
    requestedById: null,
    approvalOwnerId: null,
    approvalOwnerMembershipId: null,
    decisionComment: null,
    decidedAt: null,
    createdBy: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    deletedAt: null,
  };

  it("calls useBuildListKeyboard with itemCount equal to the number of rows in the ready state", () => {
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: {
          data: [crRow],
          pagination: { hasMore: false, nextCursor: null, limit: 25 },
        },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ itemCount: 1 }),
    );
  });

  it("enables keyboard shortcuts when the page is in ready state", () => {
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: {
          data: [crRow],
          pagination: { hasMore: false, nextCursor: null, limit: 25 },
        },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it("disables keyboard shortcuts while the page is loading so j/k do not misfire", () => {
    mockUseChangeRequests.mockReturnValue(baseQueryResult({ isLoading: true }));
    render(<ChangeRequestsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it("passes an onOpen callback that opens the edit sheet for the row at the given index", () => {
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: {
          data: [crRow],
          pagination: { hasMore: false, nextCursor: null, limit: 25 },
        },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    const { onOpen } = mockUseBuildListKeyboard.mock.calls[
      mockUseBuildListKeyboard.mock.calls.length - 1
    ][0] as { onOpen: (index: number) => void };
    expect(() => onOpen(0)).not.toThrow();
  });

  it("passes onCreate when the user has build:changerequests:create permission so the c key opens the new CR sheet", () => {
    mockUseCan.mockReturnValue(true);
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: { data: [crRow], pagination: { hasMore: false, nextCursor: null, limit: 25 } },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    const { onCreate } = mockUseBuildListKeyboard.mock.calls[
      mockUseBuildListKeyboard.mock.calls.length - 1
    ][0] as { onCreate: unknown };
    expect(onCreate).toBeDefined();
  });

  it("omits onCreate when the user lacks create permission so the c key does not fire", () => {
    mockUseCan.mockReturnValue(false);
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: { data: [crRow], pagination: { hasMore: false, nextCursor: null, limit: 25 } },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    const { onCreate } = mockUseBuildListKeyboard.mock.calls[
      mockUseBuildListKeyboard.mock.calls.length - 1
    ][0] as { onCreate: unknown };
    expect(onCreate).toBeUndefined();
  });

  it("passes onEdit so the e key opens the focused row in the edit sheet", () => {
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: { data: [crRow], pagination: { hasMore: false, nextCursor: null, limit: 25 } },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    const { onEdit } = mockUseBuildListKeyboard.mock.calls[
      mockUseBuildListKeyboard.mock.calls.length - 1
    ][0] as { onEdit: unknown };
    expect(onEdit).toBeDefined();
  });
});

describe("ChangeRequestsPage — bulk status action", () => {
  const crRow = {
    id: 7,
    orgId: "org-1",
    projectId: 1,
    crNumber: 7,
    title: "bulk target",
    description: null,
    impact: null,
    estimateMinutes: null,
    budgetImpactCents: null,
    timelineImpactDays: null,
    status: "submitted" as const,
    requestedById: null,
    approvalOwnerId: null,
    approvalOwnerMembershipId: null,
    decisionComment: null,
    decidedAt: null,
    releaseId: null,
    clientVisible: false,
    createdBy: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    deletedAt: null,
  };

  it("shows the bulk action bar with the selected count after a row is selected", () => {
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: { data: [crRow], pagination: { hasMore: false, nextCursor: null, limit: 25 } },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("data-table"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("hides the bulk action bar after the clear button is clicked", () => {
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: { data: [crRow], pagination: { hasMore: false, nextCursor: null, limit: 25 } },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    fireEvent.click(screen.getByTestId("data-table"));
    fireEvent.click(screen.getByLabelText("Clear selection"));
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });
});
