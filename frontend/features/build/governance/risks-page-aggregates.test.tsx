import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { Risk } from "@/types/projects";
import type { IdCursorPage } from "@/hooks/api/cursor-page-schema";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseProjectRisks = jest.fn();
const mockUseProjectRiskStats = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/build/1/risks",
  useSearchParams: () => new URLSearchParams(),
}));

function riskPage<T>(rows: T[]) {
  return { data: rows, hasMore: false, nextCursor: null };
}

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: () => mockUseCan(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build", () => ({
  useProjectRisks: (projectId: number, filters?: { status?: string }) =>
    mockUseProjectRisks(projectId, filters),
  useProjectRiskStats: (...args: unknown[]) => mockUseProjectRiskStats(...args),
  useCreateRisk: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateRisk: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteRisk: () => ({ mutate: jest.fn(), isPending: false }),
  useProjectMembers: () => ({ data: [] }),
  GOVERNANCE_PAGE_SIZE: 100,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    filters,
    title,
  }: {
    children: ReactNode;
    filters?: ReactNode;
    title?: string;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {filters}
      {children}
    </div>
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
    <input {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: ReactNode;
  }) => (
    <select
      data-testid="status-filter"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label, value }: { label: string; value: number }) => (
    <div>{`${label}: ${value}`}</div>
  ),
  StatCardGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: { children?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
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
  PlusIcon: ({ ref: _r, ...p }: { ref?: unknown } & React.HTMLAttributes<HTMLElement>) => (
    <span {...p} />
  ),
  EllipsisIcon: ({ ref: _r, ...p }: { ref?: unknown } & React.HTMLAttributes<HTMLElement>) => (
    <span {...p} />
  ),
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

jest.mock("./risk-form-sheet", () => ({
  RiskFormSheet: () => null,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/lib/text-overflow", () => ({
  TABLE_TITLE_CELL: "",
}));

import { RisksPage } from "./risks-page";

const ACCESS_GRANTED_RISKS = {
  data: { isOrgOwner: false, scopes: { "build:risks:view": "all" }, modules: {} },
  isLoading: false,
};

function makeRisk(overrides: Partial<Risk>): Risk {
  return {
    id: 1,
    orgId: "org_1",
    projectId: 10,
    riskNumber: 1,
    title: "Untitled risk",
    description: null,
    probability: "low",
    impact: "low",
    status: "open",
    ownerId: null,
    mitigation: null,
    linkedTicketId: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const OPEN_HIGH_RISK = makeRisk({
  id: 1,
  riskNumber: 1,
  title: "Data center outage",
  probability: "high",
  impact: "high",
  status: "open",
});

const CLOSED_LOW_RISK = makeRisk({
  id: 2,
  riskNumber: 2,
  title: "Retired vendor risk",
  probability: "low",
  impact: "low",
  status: "closed",
});

const REGISTER = [OPEN_HIGH_RISK, CLOSED_LOW_RISK];

const REGISTER_STATS = {
  total: 2,
  open: 1,
  closed: 1,
  highCritical: 1,
  matrix: [{ probability: "high" as const, impact: "high" as const, openCount: 1 }],
};
const SERVER_CLOSED_FILTER_RESULT = [CLOSED_LOW_RISK];

function idleQuery(data: IdCursorPage<Risk>) {
  return { data, isLoading: false, isError: false, error: null, refetch: jest.fn() };
}

describe("RisksPage aggregates and matrix describe the whole register, not the active status filter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccess.mockReturnValue(ACCESS_GRANTED_RISKS);
    mockUseCan.mockReturnValue(true);
    mockUseProjectRisks.mockImplementation((_projectId: number, filters?: { status?: string }) => {
      if (filters?.status === "closed") return idleQuery(riskPage(SERVER_CLOSED_FILTER_RESULT));
      return idleQuery(riskPage(REGISTER));
    });
    mockUseProjectRiskStats.mockReturnValue({
      data: REGISTER_STATS,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it("keeps the Open and High/Critical tiles at the register count after selecting Closed, instead of reading 0 from the server-filtered rows", async () => {
    render(<RisksPage projectId={10} />);

    const user = userEvent.setup();
    await user.selectOptions(screen.getByTestId("status-filter"), "closed");

    expect(screen.getByText("Open: 1")).toBeInTheDocument();
    expect(screen.getByText("High / Critical: 1")).toBeInTheDocument();
    expect(screen.getByText("Closed: 1")).toBeInTheDocument();
  });

  it("keeps the risk matrix showing the register's open risks after selecting Closed, instead of going blank", async () => {
    render(<RisksPage projectId={10} />);

    const user = userEvent.setup();
    await user.selectOptions(screen.getByTestId("status-filter"), "closed");

    expect(
      screen.getByRole("button", { name: "high probability, high impact: 1 open risk" }),
    ).toBeInTheDocument();
  });

  it("reads the tiles from an aggregate the status filter cannot reach, so they cannot be narrowed to the filtered page", async () => {
    render(<RisksPage projectId={10} />);

    const user = userEvent.setup();
    await user.selectOptions(screen.getByTestId("status-filter"), "closed");

    for (const call of mockUseProjectRiskStats.mock.calls) {
      expect(call).toEqual([10]);
    }
  });
});
