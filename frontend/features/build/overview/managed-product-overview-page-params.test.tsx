import { fireEvent, render, screen } from "@testing-library/react";
import { ManagedProductOverviewPage } from "./managed-product-overview-page";

const usePageState = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/managed-products/42",
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  BUILD_FILTER_ALL: "all",
  useBuildListFilters: jest.fn(() => ({
    value: jest.fn(() => undefined),
    setValue: jest.fn(),
    isActive: jest.fn(() => false),
    clearAll: jest.fn(),
    search: "",
    debouncedSearch: "",
    setSearch: jest.fn(),
    isFiltered: false,
  })),
}));

jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => usePageState(...args),
}));

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProduct: jest.fn(() => ({
    data: { id: 42, name: "Payments Platform", key: "PAY", description: null, vision: null },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
  useManagedProductInsights: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItems: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(() => ({
    data: { data: [{ userId: "user-abc", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" }] },
  })),
}));

jest.mock("@/features/build/managed-products/managed-product-form-sheet", () => ({
  ManagedProductFormSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="managed-product-edit-sheet" /> : null,
}));

jest.mock("@/hooks/api/goals", () => ({
  useGoalsPage: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  usePageState.mockReturnValue({ kind: "ready" });
});

describe("ManagedProductOverviewPage — URL-backed ownerId/status/cursor (BSN-OVW-PARAMS)", () => {
  it("forwards ownerId URL param as managerId to useProjects so projects are filtered by owner server-side", () => {
    const { useBuildListFilters } = jest.requireMock("@/features/build/shared/use-build-list-filters");
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn((key: string) => (key === "ownerId" ? "user-abc" : undefined)),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
      search: "",
      debouncedSearch: "",
      setSearch: jest.fn(),
      isFiltered: false,
    });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ managerId: "user-abc" }),
      expect.anything(),
    );
  });

  it("forwards status URL param to useProjects when it is a recognised project status value", () => {
    const { useBuildListFilters } = jest.requireMock("@/features/build/shared/use-build-list-filters");
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn((key: string) => (key === "status" ? "ACTIVE" : undefined)),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
      search: "",
      debouncedSearch: "",
      setSearch: jest.fn(),
      isFiltered: false,
    });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ACTIVE" }),
      expect.anything(),
    );
  });

  it("passes undefined status when the URL value is not a recognised project status so unrecognised values do not reach the backend", () => {
    const { useBuildListFilters } = jest.requireMock("@/features/build/shared/use-build-list-filters");
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn((key: string) => (key === "status" ? "unknown-value" : undefined)),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
      search: "",
      debouncedSearch: "",
      setSearch: jest.fn(),
      isFiltered: false,
    });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined }),
      expect.anything(),
    );
  });

  it("parses the cursor URL param as an integer and passes it as afterId to useProjects", () => {
    const { useBuildListFilters } = jest.requireMock("@/features/build/shared/use-build-list-filters");
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn((key: string) => (key === "cursor" ? "55" : undefined)),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
      search: "",
      debouncedSearch: "",
      setSearch: jest.fn(),
      isFiltered: false,
    });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ afterId: 55 }),
      expect.anything(),
    );
  });

  it("omits afterId when cursor param is absent so the first page is shown by default", () => {
    const { useBuildListFilters } = jest.requireMock("@/features/build/shared/use-build-list-filters");
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn(() => undefined),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
      search: "",
      debouncedSearch: "",
      setSearch: jest.fn(),
      isFiltered: false,
    });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const [params] = (useProjects as jest.Mock).mock.calls[0] as [Record<string, unknown>];
    expect(params).not.toHaveProperty("afterId");
  });
});

function mockFilters(values: Record<string, string>, setValue = jest.fn()) {
  const { useBuildListFilters } = jest.requireMock(
    "@/features/build/shared/use-build-list-filters",
  );
  (useBuildListFilters as jest.Mock).mockReturnValue({
    value: jest.fn((key: string) => values[key] ?? "all"),
    setValue,
    isActive: jest.fn((key: string) => values[key] !== undefined),
    clearAll: jest.fn(),
    search: "",
    debouncedSearch: "",
    setSearch: jest.fn(),
    isFiltered: false,
  });
  return setValue;
}

describe("ManagedProductOverviewPage — sort param and its cursor agreement (BSN-OVW-SORT)", () => {
  it("forwards a recognised sort URL param to useProjects so ordering happens server-side", () => {
    mockFilters({ sort: "name_asc" });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "name_asc" }),
      expect.anything(),
    );
  });

  it("drops a sort value the backend enum does not declare so the read cannot 400", () => {
    mockFilters({ sort: "created_desc" });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const [params] = (useProjects as jest.Mock).mock.calls[0] as [Record<string, unknown>];
    expect(params).not.toHaveProperty("sort");
  });

  it("drops the id cursor while a sort is active, because the keyset read switches to afterSortValue and an afterId would be silently ignored", () => {
    mockFilters({ sort: "due_asc", cursor: "55" });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const [params] = (useProjects as jest.Mock).mock.calls[0] as [Record<string, unknown>];
    expect(params).not.toHaveProperty("afterId");
    expect(params).toMatchObject({ sort: "due_asc" });
  });

  it("keeps the id cursor when no sort is active, so descending-id paging still works", () => {
    mockFilters({ cursor: "55" });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ afterId: 55 }),
      expect.anything(),
    );
  });

  it("drops a non-numeric cursor rather than sending NaN as afterId", () => {
    mockFilters({ cursor: "not-a-number" });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const [params] = (useProjects as jest.Mock).mock.calls[0] as [Record<string, unknown>];
    expect(params).not.toHaveProperty("afterId");
  });

  it("renders an owner and a sort control so both declared params are reachable without editing the URL", () => {
    mockFilters({});
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByLabelText("Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort")).toBeInTheDocument();
  });

  it("writes the picked sort to the URL rather than holding it in React state", () => {
    const setValue = mockFilters({});
    render(<ManagedProductOverviewPage managedProductId={42} />);
    fireEvent.keyDown(screen.getByLabelText("Sort"), { key: "Enter" });
    expect(screen.getByLabelText("Sort")).toBeInTheDocument();
    expect(setValue).not.toHaveBeenCalledWith("sort", "all");
  });
});

describe("ManagedProductOverviewPage — owner core field (BSN-OVW-OWNER)", () => {
  it("renders the resolved owner name, never the raw ownerId (FE-85)", () => {
    mockFilters({});
    const { useManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products");
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: {
        id: 42,
        name: "Payments Platform",
        key: "PAY",
        status: "active",
        updatedAt: "2026-09-28T00:00:00.000Z",
        ownerId: "7f3c1b2e-0000-4000-8000-000000000001",
        owner: {
          id: "7f3c1b2e-0000-4000-8000-000000000001",
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          image: null,
        },
        description: null,
        vision: null,
        version: 1,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByText(/Owner Ada Lovelace/)).toBeInTheDocument();
    expect(screen.queryByText(/7f3c1b2e/)).not.toBeInTheDocument();
  });

  it("says Unassigned rather than blank when the product has no owner", () => {
    mockFilters({});
    const { useManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products");
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: {
        id: 42,
        name: "Payments Platform",
        key: "PAY",
        status: "active",
        updatedAt: "2026-09-28T00:00:00.000Z",
        ownerId: null,
        owner: null,
        description: null,
        vision: null,
        version: 1,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByText(/Owner Unassigned/)).toBeInTheDocument();
  });
});

describe("ManagedProductOverviewPage — edit action and conflict overlay (BSN-OVW-EDIT)", () => {
  it("offers the edit action to a permitted viewer and opens the versioned edit sheet", () => {
    mockFilters({});
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(true);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Edit product/i })[0]!);
    expect(screen.getByTestId("managed-product-edit-sheet")).toBeInTheDocument();
  });

  it("offers no edit action to a viewer without build:managed-products:update (FE-122 paired negative)", () => {
    mockFilters({});
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(false);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.queryAllByRole("button", { name: /Edit product/i })).toHaveLength(0);
  });
});

describe("ManagedProductOverviewPage — offline state (BSN-OVW-OFFLINE)", () => {
  const onlineSpy = jest.spyOn(navigator, "onLine", "get");

  afterEach(() => {
    onlineSpy.mockReturnValue(true);
  });

  it("renders no offline notice while online, so the banner is not permanent furniture", () => {
    onlineSpy.mockReturnValue(true);
    mockFilters({});
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.queryByTestId("offline-notice")).not.toBeInTheDocument();
  });

  it("shows freshness rather than blanking the overview when the browser goes offline", () => {
    onlineSpy.mockReturnValue(false);
    mockFilters({});
    const { useManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products");
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: { id: 42, name: "Payments Platform", key: "PAY", status: "active", owner: null, description: null, vision: null, version: 1 },
      dataUpdatedAt: Date.now(),
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByTestId("offline-notice")).toHaveTextContent(/Offline — showing data/);
  });

  it("withdraws the edit action while offline, because a managed-product write is not an idempotent command", () => {
    onlineSpy.mockReturnValue(false);
    mockFilters({});
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(true);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.queryAllByRole("button", { name: /Edit product/i })).toHaveLength(0);
  });
});

describe("ManagedProductOverviewPage — linked project row context menu (BSN-OVW-CONTEXT)", () => {
  it("right-click on a linked project row offers open and copy link, so the row's commands are not hidden behind hover alone", () => {
    mockFilters({});
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    (useProjects as jest.Mock).mockReturnValue({
      data: {
        data: [{ id: 9, name: "Checkout", key: "CHK", status: "ACTIVE" }],
        hasMore: false,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    fireEvent.contextMenu(screen.getByText("Checkout").closest("div")!);
    expect(screen.getByText("Open project")).toBeInTheDocument();
    expect(screen.getByText("Copy link")).toBeInTheDocument();
  });
});
