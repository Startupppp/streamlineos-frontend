import { fireEvent, render, screen } from "@testing-library/react";
import { ProgramsPage } from "./programs-page";

const mockReplace = jest.fn();
const mockSearchParamsContainer = { current: new URLSearchParams() };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/build/programs",
  useSearchParams: () => mockSearchParamsContainer.current,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/build", () => ({
  usePrograms: jest.fn(),
  usePortfolios: jest.fn(() => ({ data: undefined })),
  useProjects: jest.fn(() => ({ data: undefined })),
  useCreateProgram: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateProgram: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteProgram: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, empty, children }: {
    resolution: { kind: string; permission?: string | null };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (
      resolution.kind === "denied" ||
      resolution.kind === "module-disabled" ||
      resolution.kind === "module-denied" ||
      resolution.kind === "plan-required"
    )
      return (
        <div
          data-testid="denied-state"
          data-permission={resolution.kind === "denied" ? resolution.permission : undefined}
        />
      );
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    if (resolution.kind === "empty") return <>{empty ?? children}</>;
    return <>{children}</>;
  },
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters, actions }: {
    children: React.ReactNode;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>{actions}{filters}{children}</div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
  PM_PANEL: "",
  PM_ROW: "",
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => null,
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: ({ search, filters, onClearAll }: {
    search?: {
      value: string;
      onValueChange: (value: string) => void;
      label?: string;
      placeholder: string;
    };
    filters?: readonly { id: string; control: React.ReactNode }[];
    onClearAll?: () => void;
  }) => (
    <div>
      {search ? (
        <input
          aria-label={search.label ?? search.placeholder}
          value={search.value}
          onChange={(event) => search.onValueChange(event.target.value)}
        />
      ) : null}
      {filters?.map((filter) => <div key={filter.id}>{filter.control}</div>)}
      <button type="button" onClick={onClearAll}>Clear all</button>
    </div>
  ),
}));

jest.mock("@/features/build/shared/build-filter-select", () => ({
  BuildFilterSelect: ({ label, value, onValueChange, options }: {
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    options: readonly { value: string; label: string }[];
  }) => (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: () => null,
  SelectContent: () => null,
  SelectItem: () => null,
  SelectValue: () => null,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
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

jest.mock("@/features/build/portfolios/portfolio-status-badge", () => ({
  PortfolioStatusBadge: () => null,
  PortfolioHealthBadge: () => null,
}));

jest.mock("./program-form-sheet", () => ({
  ProgramFormSheet: () => null,
}));

const { usePrograms } = jest.requireMock("@/hooks/api/build") as {
  usePrograms: jest.Mock;
};
const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParamsContainer.current = new URLSearchParams();
  usePageState.mockReturnValue({ kind: "ready" });
});

describe("ProgramsPage — denied state (BSN-FE-D2)", () => {
  it("shows denied state when usePageState returns denied, not empty state", () => {
    usePrograms.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "denied", permission: "build:programs:view" });

    render(<ProgramsPage />);

    expect(screen.getByTestId("denied-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes the programs permission key to denied state", () => {
    usePrograms.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "denied", permission: "build:programs:view" });

    render(<ProgramsPage />);

    expect(screen.getByTestId("denied-state")).toHaveAttribute(
      "data-permission",
      "build:programs:view",
    );
  });

  it("shows data table when usePageState returns ready with data", () => {
    usePrograms.mockReturnValue({
      data: {
        data: [
          { id: 1, name: "Test Program", status: "active", portfolioId: null, ownerId: null, health: null },
        ],
        pagination: { limit: 25, hasMore: false, nextCursor: null },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<ProgramsPage />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.queryByTestId("denied-state")).not.toBeInTheDocument();
  });

  it("sends URL search, filters, and sort to the server query", () => {
    mockSearchParamsContainer.current = new URLSearchParams(
      "q=launch&ownerId=user-2&health=at_risk&status=on_hold&portfolioId=7&projectId=9&sort=name&order=asc",
    );
    usePrograms.mockReturnValue({
      data: { data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProgramsPage />);

    expect(usePrograms).toHaveBeenCalledWith({
      cursor: undefined,
      limit: 25,
      q: "launch",
      ownerId: "user-2",
      health: "at_risk",
      status: "on_hold",
      portfolioId: 7,
      projectId: 9,
      sort: "name",
      order: "asc",
    });
  });

  it("writes filter and sort changes to the URL and clears the stale cursor", () => {
    mockSearchParamsContainer.current = new URLSearchParams("q=launch&cursor=stale");
    usePrograms.mockReturnValue({
      data: { data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProgramsPage />);

    fireEvent.change(screen.getByLabelText("Health"), {
      target: { value: "off_track" },
    });
    expect(mockReplace).toHaveBeenCalledWith(
      "/build/programs?q=launch&health=off_track",
      { scroll: false },
    );

    fireEvent.change(screen.getByLabelText("Sort programs"), {
      target: { value: "name" },
    });
    expect(mockReplace).toHaveBeenCalledWith(
      "/build/programs?q=launch&sort=name",
      { scroll: false },
    );

    fireEvent.click(screen.getByLabelText("Sort descending"));
    expect(mockReplace).toHaveBeenCalledWith(
      "/build/programs?q=launch&order=asc",
      { scroll: false },
    );
  });
});
