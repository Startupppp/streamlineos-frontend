import { render, screen } from "@testing-library/react";
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

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
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
}));

jest.mock("lucide-react", () => ({
  Lock: () => <span />,
  ShieldOff: () => <span />,
  Zap: () => <span />,
}));

import { useChangeRequests, useDeleteChangeRequest } from "@/hooks/api/build/change-requests";
import { useCan, useAccess } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";

const mockUseChangeRequests = useChangeRequests as jest.Mock;
const mockUseDeleteChangeRequest = useDeleteChangeRequest as jest.Mock;
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
  mockUseOrgMembers.mockReturnValue(baseQueryResult({ data: { data: [] } }));
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

  it("shows a load-more button when the server reports hasMore so the user can fetch the next page", () => {
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: {
          data: [crRow],
          pagination: { hasMore: true, nextCursor: "cursor-xyz", limit: 25 },
        },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("does not show a load-more button when the page is complete so the user knows they have seen all records", () => {
    mockUseChangeRequests.mockReturnValue(
      baseQueryResult({
        data: {
          data: [crRow],
          pagination: { hasMore: false, nextCursor: null, limit: 25 },
        },
      }),
    );
    render(<ChangeRequestsPage projectId={1} />);
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });
});
