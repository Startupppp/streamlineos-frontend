import { render, screen } from "@testing-library/react";
import { TeamsListPage } from "./teams-list-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/teams",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string; permission?: string | null };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <div data-testid="page-state-loading">{loading}</div>;
    if (resolution.kind === "denied")
      return (
        <div
          data-testid="no-permission"
          data-permission={resolution.permission ?? ""}
        />
      );
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    if (resolution.kind === "empty") return <div data-testid="page-state-empty">{empty}</div>;
    return <div data-testid="page-state-ready">{children}</div>;
  },
}));

jest.mock("@/hooks/api/build/teams", () => ({
  useProjectTeams: jest.fn(),
  useCreateProjectTeam: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateProjectTeam: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteProjectTeam: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    filters,
    actions,
  }: {
    children: React.ReactNode;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      {actions}
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({
    data,
    getRowKey,
  }: {
    data?: Array<{ name?: string; id?: unknown }>;
    getRowKey?: (row: { name?: string; id?: unknown }, i: number) => string | number;
  }) => (
    <div data-testid="data-table">
      {(data ?? []).map((row, i) => (
        <span key={getRowKey ? String(getRowKey(row, i)) : i}>{row.name}</span>
      ))}
    </div>
  ),
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => null,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/features/build/teams/team-form-sheet", () => ({
  TeamFormSheet: () => null,
}));

jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: () => ({ open: false, onOpenChange: jest.fn(), setOpen: jest.fn() }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
  EllipsisIcon: () => null,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/lib/text-overflow", () => ({
  TABLE_TITLE_CELL: "",
  TEXT_ONE_LINE: "",
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  FILTER_TOOLBAR_ROW: "",
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: { children?: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};
const { useProjectTeams } = jest.requireMock("@/hooks/api/build/teams") as {
  useProjectTeams: jest.Mock;
};

const EMPTY_TEAMS_RESULT = {
  data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 50 } },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  useProjectTeams.mockReturnValue(EMPTY_TEAMS_RESULT);
  usePageState.mockReturnValue({ kind: "ready" });
});

describe("TeamsListPage — usePageState integration (FE-40, FE-41, FE-47, FE-49)", () => {
  it("calls usePageState with build:teams:view permission so 402 errors are classified correctly", () => {
    render(<TeamsListPage />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:teams:view" }),
    );
  });

  it("passes error to usePageState so MODULE_NOT_ENABLED 402 upgradePath is surfaced correctly", () => {
    const err = new Error("MODULE_NOT_ENABLED");
    useProjectTeams.mockReturnValue({ ...EMPTY_TEAMS_RESULT, isError: true, error: err });
    render(<TeamsListPage />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ error: err }),
    );
  });

  it("renders the data table when resolution is ready and teams exist", () => {
    const teams = [
      { id: 1, name: "Alpha Squad", key: "AS", memberCount: 3, icon: null, color: null, isPrivate: false },
    ];
    useProjectTeams.mockReturnValue({
      ...EMPTY_TEAMS_RESULT,
      data: { data: teams, pagination: { hasMore: false, nextCursor: null, limit: 50 } },
    });
    usePageState.mockReturnValue({ kind: "ready" });
    render(<TeamsListPage />);
    expect(screen.getByTestId("page-state-ready")).toBeInTheDocument();
    expect(screen.getByText("Alpha Squad")).toBeInTheDocument();
  });

  it("renders the skeleton when resolution is loading and does not show data or empty state", () => {
    usePageState.mockReturnValue({ kind: "loading" });
    render(<TeamsListPage />);
    expect(screen.getByTestId("page-state-loading")).toBeInTheDocument();
    expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("page-state-ready")).not.toBeInTheDocument();
    expect(screen.queryByTestId("page-state-empty")).not.toBeInTheDocument();
  });

  it("renders the empty state when resolution is empty and does not show ready content", () => {
    usePageState.mockReturnValue({ kind: "empty" });
    render(<TeamsListPage />);
    expect(screen.getByTestId("page-state-empty")).toBeInTheDocument();
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("page-state-ready")).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-table-skeleton")).not.toBeInTheDocument();
  });

  it("renders the error state when resolution is error and does not show ready or empty content", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("network failure") });
    render(<TeamsListPage />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("page-state-ready")).not.toBeInTheDocument();
    expect(screen.queryByTestId("page-state-empty")).not.toBeInTheDocument();
  });

  it("routes a denied resolution to PageState so the empty state is not shown instead", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:teams:view" });
    render(<TeamsListPage />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("page-state-empty")).not.toBeInTheDocument();
  });

  it("passes the resolution object to PageState unmodified so the permission key is preserved", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:teams:view" });
    render(<TeamsListPage />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "build:teams:view",
    );
  });

  it("does not show ready content when access is denied", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:teams:view" });
    render(<TeamsListPage />);
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("page-state-ready")).not.toBeInTheDocument();
  });

  it("passes isEmpty: true to usePageState when the teams list is empty", () => {
    useProjectTeams.mockReturnValue(EMPTY_TEAMS_RESULT);
    render(<TeamsListPage />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isEmpty: true }),
    );
  });

  it("passes isEmpty: false to usePageState when the teams list is non-empty", () => {
    const teams = [
      { id: 1, name: "Delta Force", key: "DF", memberCount: 2, icon: null, color: null, isPrivate: false },
    ];
    useProjectTeams.mockReturnValue({
      ...EMPTY_TEAMS_RESULT,
      data: { data: teams, pagination: { hasMore: false, nextCursor: null, limit: 50 } },
    });
    render(<TeamsListPage />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isEmpty: false }),
    );
  });

  it("passes isLoading: true to usePageState when the hook reports loading", () => {
    useProjectTeams.mockReturnValue({ ...EMPTY_TEAMS_RESULT, isLoading: true });
    render(<TeamsListPage />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isLoading: true }),
    );
  });

  it("passes isLoading: false to usePageState when the hook is not loading", () => {
    useProjectTeams.mockReturnValue({ ...EMPTY_TEAMS_RESULT, isLoading: false });
    render(<TeamsListPage />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isLoading: false }),
    );
  });

  it("passes isError: true to usePageState when the hook reports an error", () => {
    useProjectTeams.mockReturnValue({ ...EMPTY_TEAMS_RESULT, isError: true });
    render(<TeamsListPage />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isError: true }),
    );
  });

  it("passes isError: false to usePageState when the hook reports no error", () => {
    useProjectTeams.mockReturnValue({ ...EMPTY_TEAMS_RESULT, isError: false });
    render(<TeamsListPage />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isError: false }),
    );
  });
});
