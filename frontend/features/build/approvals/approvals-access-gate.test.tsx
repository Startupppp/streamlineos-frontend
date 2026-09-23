import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseApprovalInbox = jest.fn();
const mockUseProjectApprovals = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: () => mockUseCan(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build", () => ({
  useApprovalInbox: () => mockUseApprovalInbox(),
  useDecideApproval: () => ({ mutate: jest.fn(), isPending: false }),
  useProjectApprovals: () => mockUseProjectApprovals(),
  useCreateApproval: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateApproval: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteApproval: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: ReactNode; title?: string }) => (
    <div>{title ? <h1>{title}</h1> : null}{children}</div>
  ),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => null,
  StatCardGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => <div data-testid="stat-skeleton" />,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("./approval-status-badge", () => ({
  ApprovalStatusBadge: () => null,
  entityTypeLabel: () => "Task",
}));

jest.mock("./decide-dialog", () => ({
  DecideDialog: () => null,
}));

jest.mock("./delegate-dialog", () => ({
  DelegateDialog: () => null,
}));

jest.mock("./request-approval-sheet", () => ({
  RequestApprovalSheet: () => null,
}));

jest.mock("./approvals-toolbar", () => ({
  RequestApprovalMenuButton: () => null,
}));

jest.mock("./approvals-filter-bar", () => ({
  ApprovalsFilterBar: () => null,
}));

jest.mock("./use-approvals-columns", () => ({
  useApprovalsColumns: () => [],
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/lib/text-overflow", () => ({
  TABLE_TITLE_CELL: "",
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import { ApprovalsInboxPage } from "./approvals-inbox-page";
import { ProjectApprovalsPage } from "./project-approvals-page";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
});


const ACCESS_LOADING = { data: undefined, isLoading: true };
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_GRANTED_APPROVALS = {
  data: { isOrgOwner: false, scopes: { "build:approvals:view": "all" }, modules: {} },
  isLoading: false,
};

function idleQuery() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

describe("ApprovalsInboxPage — access is three-valued, not a boolean", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccess.mockReturnValue(ACCESS_GRANTED_APPROVALS);
    mockUseCan.mockReturnValue(true);
    mockUseApprovalInbox.mockReturnValue({ ...idleQuery(), data: [] });
  });

  it("does not show the empty-state while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(ACCESS_LOADING);
    mockUseCan.mockReturnValue(false);
    mockUseApprovalInbox.mockReturnValue(idleQuery());

    render(<ApprovalsInboxPage />);

    expect(screen.queryByTestId("empty-state")).toBeNull();
    expect(screen.queryByTestId("no-permission")).toBeNull();
  });

  it("shows NoPermissionState when build:approvals:view resolves to denied, not an empty approvals list", () => {
    mockUseAccess.mockReturnValue(ACCESS_DENIED);
    mockUseCan.mockReturnValue(false);
    mockUseApprovalInbox.mockReturnValue(idleQuery());

    render(<ApprovalsInboxPage />);

    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });
});

describe("ProjectApprovalsPage — access is three-valued, not a boolean", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccess.mockReturnValue(ACCESS_GRANTED_APPROVALS);
    mockUseCan.mockReturnValue(true);
    mockUseProjectApprovals.mockReturnValue({ ...idleQuery(), data: [] });
  });

  it("does not show the empty-state while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(ACCESS_LOADING);
    mockUseCan.mockReturnValue(false);
    mockUseProjectApprovals.mockReturnValue(idleQuery());

    render(<ProjectApprovalsPage projectId={1} />);

    expect(screen.queryByTestId("empty-state")).toBeNull();
    expect(screen.queryByTestId("no-permission")).toBeNull();
  });

  it("shows NoPermissionState when build:approvals:view resolves to denied, not an empty approvals list", () => {
    mockUseAccess.mockReturnValue(ACCESS_DENIED);
    mockUseCan.mockReturnValue(false);
    mockUseProjectApprovals.mockReturnValue(idleQuery());

    render(<ProjectApprovalsPage projectId={1} />);

    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });
});
