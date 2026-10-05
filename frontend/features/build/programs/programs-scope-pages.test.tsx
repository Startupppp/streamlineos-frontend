import { fireEvent, render, screen } from "@testing-library/react";
import { ProgramDetailPage } from "./program-detail-page";
import { ProgramsPage } from "./programs-page";
import { buildProgramColumns } from "./program-table-columns";
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
jest.mock("@/hooks/api/build/programs", () => ({
  usePrograms: jest.fn(),
  useProgram: jest.fn(),
  useCreateProgram: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateProgram: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteProgram: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));
jest.mock("@/hooks/api/build/portfolios", () => ({
  usePortfolios: jest.fn(() => ({ data: undefined })),
}));
jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: jest.fn(() => ({ data: undefined })),
}));
jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(() => ({ data: undefined })),
}));
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));
jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, empty, children, onRetry }: {
    resolution: { kind: string; permission?: string | null };
    loading: React.ReactNode;
    onRetry?: () => void;
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
    if (resolution.kind === "error") return <button onClick={onRetry}>Retry</button>;
    if (resolution.kind === "not-found") return <div>Program not found</div>;
    if (resolution.kind === "empty") return <>{empty ?? children}</>;
    return <>{children}</>;
  },
}));
jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters, actions, title }: {
    children: React.ReactNode;
    filters?: React.ReactNode;
    actions?: React.ReactNode;
    title?: React.ReactNode;
  }) => (
    <div><h1>{title}</h1>{actions}{filters}{children}</div>
  ),
}));
jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CONTENT_FILL_PANEL: "",
  PM_PANEL: "",
  PM_ROW: "",
}));
jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));
jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title?: string }) => (
    <div data-testid="empty-state">{title ? <span>{title}</span> : null}</div>
  ),
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
jest.mock("@/hooks/common/use-query-param-open", () => {
  const { useState } = jest.requireActual("react");
  return {
    useQueryParamOpen: () => {
      const [open, setOpen] = useState(false);
      return { open, onOpenChange: (v: boolean) => setOpen(v), setOpen: () => setOpen(true) };
    },
  };
});
jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));
jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
  EllipsisIcon: () => null,
}));
jest.mock("@/features/build/portfolios/portfolio-status-badge", () => ({
  PortfolioStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
  PortfolioHealthBadge: ({ health }: { health: string }) => <span>{health}</span>,
}));
jest.mock("./program-form-sheet", () => ({
  ProgramFormSheet: ({ open }: { open?: boolean }) =>
    open ? <div data-testid="program-form-sheet" /> : null,
}));
const { usePrograms, useProgram } = jest.requireMock("@/hooks/api/build/programs") as {
  usePrograms: jest.Mock;
  useProgram: jest.Mock;
};
const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};
const { useCan: mockProgramsUseCan } = jest.requireMock("@/hooks/api/access") as {
  useCan: jest.Mock;
};
beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParamsContainer.current = new URLSearchParams();
  usePageState.mockReturnValue({ kind: "ready" });
  mockProgramsUseCan.mockReturnValue(true);
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
describe("ProgramsPage — permission gates (BSN-FE-D3)", () => {
  it("hides New program button when build:programs:manage is denied because a create control must not offer authority the caller may not hold", () => {
    mockProgramsUseCan.mockReturnValue(false);
    usePrograms.mockReturnValue({
      data: { data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProgramsPage />);
    expect(screen.queryByText("New program")).not.toBeInTheDocument();
  });
  it("shows New program button when build:programs:manage is granted", () => {
    usePrograms.mockReturnValue({
      data: { data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProgramsPage />);
    expect(screen.getAllByText("New program")[0]).toBeInTheDocument();
  });
});
describe("ProgramsPage — keyboard shortcuts (BSN-FE-K1)", () => {
  it("c shortcut opens the create form sheet", () => {
    usePrograms.mockReturnValue({
      data: { data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProgramsPage />);
    fireEvent.keyDown(document, { key: "c" });
    expect(screen.getByTestId("program-form-sheet")).toBeInTheDocument();
  });
  it("e shortcut opens the edit form sheet for the focused row", () => {
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
    render(<ProgramsPage />);
    fireEvent.keyDown(document, { key: "j" });
    fireEvent.keyDown(document, { key: "e" });
    expect(screen.getByTestId("program-form-sheet")).toBeInTheDocument();
  });
});
describe("ProgramsPage — empty states (BSN-FE-E2)", () => {
  it("shows 'No programs yet' empty copy when there are no programs and no filters are active", () => {
    usePrograms.mockReturnValue({
      data: { data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });
    render(<ProgramsPage />);
    expect(screen.getByText("No programs yet")).toBeInTheDocument();
    expect(screen.queryByText("No programs match your filters")).not.toBeInTheDocument();
  });
  it("shows 'No programs match your filters' empty copy when filters are active and no programs match", () => {
    mockSearchParamsContainer.current = new URLSearchParams("status=active");
    usePrograms.mockReturnValue({
      data: { data: [], pagination: { limit: 25, hasMore: false, nextCursor: null } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });
    render(<ProgramsPage />);
    expect(screen.getByText("No programs match your filters")).toBeInTheDocument();
    expect(screen.queryByText("No programs yet")).not.toBeInTheDocument();
  });
  it("passes error to usePageState so a MODULE_NOT_ENABLED 402 shows the upgrade path rather than a generic error (FE-41)", () => {
    const err = new Error("MODULE_NOT_ENABLED");
    usePrograms.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: err,
      refetch: jest.fn(),
    });
    render(<ProgramsPage />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ error: err }),
    );
  });
});
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
describe("program-table-columns — canonical URL stability (BSN-FE-URL1)", () => {
  it("program name cell links to /build/programs/[programId] and not a volatile query param", () => {
    const columns = buildProgramColumns({
      canManage: false,
      ownerOf: () => null,
      portfolioName: () => "—",
      onEdit: () => {},
      onDelete: () => {},
    });
    const nameColumn = columns.find((c) => c.header === "Name");
    expect(nameColumn).toBeDefined();
    const row = { id: 42, orgId: "org-1", name: "Program Alpha", status: "active" as const, health: null, portfolioId: null, ownerId: null, createdBy: null, createdAt: "", updatedAt: "" };
    const cell = nameColumn!.cell(row);
    render(<>{cell}</>);
    const link = screen.getByRole("link", { name: "Program Alpha" });
    expect(link).toHaveAttribute("href", "/build/programs/42");
    expect(link.getAttribute("href")).not.toContain("?");
  });
});

describe("ProgramDetailPage canonical recovery72", () => {
  const program = {
    id: 42, orgId: "org-1", name: "Program launch", description: "Coordinated launch delivery",
    status: "on_hold", health: "at_risk", ownerId: "10000000-0000-4000-8000-000000000072", portfolioId: 707,
    createdBy: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", deletedAt: null,
    projects: { data: [{ id: 7, name: "Linked project", key: "SHIP", status: "ACTIVE", addedAt: "2026-10-01T00:00:00Z" }],
      pagination: { limit: 20, hasMore: false, nextCursor: null } },
  };
  function detail(data: unknown = program, overrides = {}) {
    const refetch = jest.fn();
    useProgram.mockReturnValue({ data, isLoading: false, isError: false, error: null, refetch, ...overrides });
    return refetch;
  }
  it("renders populated detail rather than an unconditional skeleton", () => {
    detail();
    render(<ProgramDetailPage programId={42} />);
    expect(screen.getByRole("heading", { name: "Program launch" })).toBeInTheDocument();
    expect(screen.getByText("Coordinated launch delivery")).toBeInTheDocument();
    expect(screen.getByText("on_hold")).toBeInTheDocument();
    expect(screen.getByText("at_risk")).toBeInTheDocument();
    expect(screen.queryByText(program.ownerId)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View portfolio" })).toHaveAttribute("href", "/build/portfolios/707");
    expect(screen.getByRole("link", { name: /Linked project/ })).toHaveAttribute("href", "/build/7");
    expect(useProgram).toHaveBeenCalledWith(42, expect.objectContaining({ projectsLimit: 20 }));
    expect(document.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });
  it("uses loading only while the detail query is loading", () => {
    detail(undefined, { isLoading: true });
    usePageState.mockReturnValue({ kind: "loading" });
    render(<ProgramDetailPage programId={42} />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByText("Coordinated launch delivery")).not.toBeInTheDocument();
  });
  it("renders an empty linked-project state", () => {
    detail({ ...program, projects: { data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } } });
    render(<ProgramDetailPage programId={42} />);
    expect(screen.getByText(/No projects/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Linked project/ })).not.toBeInTheDocument();
  });
  it("retries query errors through the current query refetch", () => {
    const error = new Error("Program unavailable");
    const refetch = detail(undefined, { isError: true, error });
    usePageState.mockReturnValue({ kind: "error", error });
    render(<ProgramDetailPage programId={42} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(usePageState).toHaveBeenCalledWith(expect.objectContaining({ permission: "build:programs:view", error }));
  });
  it.each(["denied", "not-found"])("hides stale detail when %s", kind => {
    detail();
    usePageState.mockReturnValue({ kind, permission: "build:programs:view" });
    render(<ProgramDetailPage programId={42} />);
    expect(screen.queryByText("Coordinated launch delivery")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Linked project/ })).not.toBeInTheDocument();
    expect(kind === "denied" ? screen.getByTestId("denied-state") : screen.getByText("Program not found")).toBeInTheDocument();
  });
  it("requests the next linked-project cursor and permits previous-page recovery", () => {
    detail({ ...program, projects: { ...program.projects, pagination: { limit: 20, hasMore: true, nextCursor: "project-next" } } });
    const view = render(<ProgramDetailPage programId={42} />);
    const applyNavigation = () => {
      mockSearchParamsContainer.current = new URLSearchParams(mockReplace.mock.calls.at(-1)[0].split("?")[1]);
      view.rerender(<ProgramDetailPage programId={42} />);
    };
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(mockReplace).toHaveBeenLastCalledWith(expect.stringContaining("cursors="), { scroll: false });
    applyNavigation();
    expect(useProgram).toHaveBeenLastCalledWith(42, { projectsCursor: "project-next", projectsLimit: 20 });
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    applyNavigation();
    expect(useProgram).toHaveBeenLastCalledWith(42, { projectsCursor: undefined, projectsLimit: 20 });
  });
});
