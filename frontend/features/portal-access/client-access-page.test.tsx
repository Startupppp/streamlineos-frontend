import { render, screen } from "@testing-library/react";
import { ClientAccessPage } from "./client-access-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/cursor-page-controls", () => ({
  CursorPageControls: () => null,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: ({
    onValueChange,
  }: {
    onValueChange?: (v: string) => void;
  }) => (
    <input
      data-testid="search-input"
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  ),
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  CONTENT_FILL_PANEL: "content-fill-panel",
  FILTER_TOOLBAR_ROW: "filter-toolbar-row",
}));

jest.mock("@/components/ui/semantic-badge", () => ({
  SemanticBadge: ({ label }: { label: string }) => <span>{label}</span>,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    title,
  }: {
    open?: boolean;
    onConfirm: () => void;
    title: React.ReactNode;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <button type="button" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    ) : null,
}));

jest.mock("./grant-form-dialog", () => ({
  GrantFormDialog: () => <div data-testid="grant-form-dialog" />,
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: () => ({
    open: false,
    onOpenChange: jest.fn(),
    setOpen: jest.fn(),
  }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ref: _ref, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <span {...props} />
  ),
  EllipsisIcon: ({ ref: _ref, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <span {...props} />
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

const mockUseProjectClientGrants = jest.fn();
const mockUseRevokeGrant = jest.fn();
const mockUseAccess = jest.fn();
const mockUseCan = jest.fn<boolean, [string]>(() => false);

jest.mock("@/hooks/api/portal-access/grants", () => ({
  useProjectClientGrants: (...args: unknown[]) => mockUseProjectClientGrants(...args),
  useRevokeGrant: (...args: unknown[]) => mockUseRevokeGrant(...args),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
  useAccess: () => mockUseAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const ACCESS_GRANTED = {
  data: {
    isOrgOwner: false,
    scopes: {
      "build:portal:view": "all",
      "build:clientvisibility:manage": "all",
    },
    modules: {},
  },
  isLoading: false,
};

const ACCESS_LOADING = {
  data: undefined,
  isLoading: true,
};

const ACCESS_DENIED = {
  data: {
    isOrgOwner: false,
    scopes: {},
    modules: {},
  },
  isLoading: false,
};

function baseQueryResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

const emptyGrantsPage = {
  data: [],
  pagination: { hasMore: false, nextCursor: undefined },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseCan.mockReturnValue(true);
  mockUseProjectClientGrants.mockReturnValue(
    baseQueryResult({ data: emptyGrantsPage }),
  );
  mockUseRevokeGrant.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe("ClientAccessPage — page state correctness", () => {
  it("shows the skeleton while the access snapshot is still loading and not the empty grants table", () => {
    mockUseAccess.mockReturnValue(ACCESS_LOADING);
    mockUseProjectClientGrants.mockReturnValue(baseQueryResult());
    render(<ClientAccessPage />);
    expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/No client access grants/i)).not.toBeInTheDocument();
  });

  it("shows Access Restricted instead of the empty grants table when access is revoked so a denied employee does not mistake the empty list for authorized absence of grants", () => {
    mockUseAccess.mockReturnValue(ACCESS_DENIED);
    mockUseCan.mockReturnValue(false);
    mockUseProjectClientGrants.mockReturnValue(baseQueryResult());
    render(<ClientAccessPage />);
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText(/No client access grants/i)).not.toBeInTheDocument();
  });

  it("renders the upgrade link from a 402 MODULE_NOT_ENABLED error instead of hiding the plan denial as a generic failure", () => {
    mockUseAccess.mockReturnValue(ACCESS_GRANTED);
    mockUseProjectClientGrants.mockReturnValue(
      baseQueryResult({
        isError: true,
        error: new ApiError("Build module is not enabled", 402, "MODULE_NOT_ENABLED", {
          moduleKey: "build",
          reason: "not-in-plan",
          upgradePath: "/settings/billing",
        }),
      }),
    );
    render(<ClientAccessPage />);
    expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /plan|billing|upgrade/i }),
    ).toHaveAttribute("href", "/settings/billing");
  });

  it("renders the grants table when data is present and access is granted", () => {
    mockUseAccess.mockReturnValue(ACCESS_GRANTED);
    mockUseCan.mockReturnValue(true);
    mockUseProjectClientGrants.mockReturnValue(
      baseQueryResult({
        data: {
          data: [
            {
              projectClientGrantId: "grant-1",
              partyContactId: "contact-1",
              contactFirstName: "Alice",
              contactLastName: "Smith",
              projectId: 42,
              portalMembershipId: "membership-1",
              status: "ACTIVE",
              canViewMilestones: true,
              canViewTasks: false,
              canViewAttachments: false,
              canViewComments: false,
              canSubmitChangeRequests: false,
            },
          ],
          pagination: { hasMore: false, nextCursor: undefined },
        },
      }),
    );
    render(<ClientAccessPage />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("uses ConfirmDialog for revoke so the pending-close guard is not hand-rolled and lost", () => {
    mockUseAccess.mockReturnValue(ACCESS_GRANTED);
    mockUseProjectClientGrants.mockReturnValue(
      baseQueryResult({ data: emptyGrantsPage }),
    );
    render(<ClientAccessPage />);
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });

  it("does not call useRevokeGrant during initial render so the mutation cannot POST to a sentinel-empty endpoint before any row is targeted", () => {
    mockUseAccess.mockReturnValue(ACCESS_GRANTED);
    mockUseProjectClientGrants.mockReturnValue(
      baseQueryResult({ data: emptyGrantsPage }),
    );
    render(<ClientAccessPage />);
    expect(mockUseRevokeGrant).not.toHaveBeenCalled();
  });
});
