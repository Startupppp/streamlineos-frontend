import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseProjectRisks = jest.fn();
const mockUseProjectDecisions = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/build/1/risks",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: () => mockUseCan(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build", () => ({
  GOVERNANCE_PAGE_SIZE: 100,
  useProjectRisks: () => mockUseProjectRisks(),
  useProjectRiskStats: () => ({ data: undefined, isLoading: false }),
  useCreateRisk: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateRisk: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteRisk: () => ({ mutate: jest.fn(), isPending: false }),
  useProjectDecisions: () => mockUseProjectDecisions(),
  useCreateDecision: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateDecision: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteDecision: () => ({ mutate: jest.fn(), isPending: false }),
  useProjectMembers: () => ({ data: [] }),
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

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: ({ value: _v, onValueChange: _ov, ...props }: Record<string, unknown>) => (
    <input {...props as React.InputHTMLAttributes<HTMLInputElement>} />
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => null,
  StatCardGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  FILTER_TOOLBAR_ROW: "",
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ...p }: React.HTMLAttributes<HTMLElement>) => <span {...p} />,
  EllipsisIcon: ({ ...p }: React.HTMLAttributes<HTMLElement>) => <span {...p} />,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("./risk-severity", () => ({
  getRiskSeverity: () => ({ label: "Low", className: "" }),
}));

jest.mock("./risk-matrix", () => ({
  RiskMatrix: () => null,
}));

jest.mock("./risk-form-sheet", () => ({
  RiskFormSheet: () => null,
}));

jest.mock("./decision-form-sheet", () => ({
  DecisionFormSheet: () => null,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/lib/text-overflow", () => ({
  TABLE_TITLE_CELL: "",
}));

import { RisksPage } from "./risks-page";
import { DecisionsPage } from "./decisions-page";

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
const ACCESS_GRANTED_RISKS = {
  data: { isOrgOwner: false, scopes: { "build:risks:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_GRANTED_DECISIONS = {
  data: { isOrgOwner: false, scopes: { "build:decisions:view": "all" }, modules: {} },
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

describe("RisksPage — access is three-valued, not a boolean", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccess.mockReturnValue(ACCESS_GRANTED_RISKS);
    mockUseCan.mockReturnValue(true);
    mockUseProjectRisks.mockReturnValue({ ...idleQuery(), data: [] });
  });

  it("does not show the empty-state while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(ACCESS_LOADING);
    mockUseCan.mockReturnValue(false);
    mockUseProjectRisks.mockReturnValue(idleQuery());

    render(<RisksPage projectId={1} />);

    expect(screen.queryByTestId("empty-state")).toBeNull();
    expect(screen.queryByTestId("no-permission")).toBeNull();
  });

  it("shows NoPermissionState when build:risks:view resolves to denied, not an empty risks list", () => {
    mockUseAccess.mockReturnValue(ACCESS_DENIED);
    mockUseCan.mockReturnValue(false);
    mockUseProjectRisks.mockReturnValue(idleQuery());

    render(<RisksPage projectId={1} />);

    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });
});

describe("DecisionsPage — access is three-valued, not a boolean", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccess.mockReturnValue(ACCESS_GRANTED_DECISIONS);
    mockUseCan.mockReturnValue(true);
    mockUseProjectDecisions.mockReturnValue({ ...idleQuery(), data: [] });
  });

  it("does not show the empty-state while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(ACCESS_LOADING);
    mockUseCan.mockReturnValue(false);
    mockUseProjectDecisions.mockReturnValue(idleQuery());

    render(<DecisionsPage projectId={1} />);

    expect(screen.queryByTestId("empty-state")).toBeNull();
    expect(screen.queryByTestId("no-permission")).toBeNull();
  });

  it("shows NoPermissionState when build:decisions:view resolves to denied, not an empty decisions list", () => {
    mockUseAccess.mockReturnValue(ACCESS_DENIED);
    mockUseCan.mockReturnValue(false);
    mockUseProjectDecisions.mockReturnValue(idleQuery());

    render(<DecisionsPage projectId={1} />);

    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });
});
