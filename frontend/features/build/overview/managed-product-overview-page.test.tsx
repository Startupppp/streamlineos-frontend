import { render, screen } from "@testing-library/react";
import { ManagedProductOverviewPage } from "./managed-product-overview-page";

const usePageState = jest.fn();
const mockRouterPush = jest.fn();
const mockUseSearchParams = jest.fn(() => new URLSearchParams());

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: mockRouterPush }),
  usePathname: () => "/build/managed-products/42",
  useSearchParams: (...args: unknown[]) => mockUseSearchParams(...args),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  BUILD_FILTER_ALL: "all",
  useBuildListFilters: jest.fn(() => ({
    value: jest.fn(() => undefined),
    setValue: jest.fn(),
    isActive: jest.fn(() => false),
    clearAll: jest.fn(),
  })),
}));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({
    focusedIndex: null,
    setFocusedIndex: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => usePageState(...args),
}));

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProduct: jest.fn(() => ({
    data: undefined,
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
  useRoadmapItems: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/goals", () => ({
  useGoalsPage: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ManagedProductOverviewPage", () => {
  it("renders access-restricted state when permission is denied so denial is never silently empty", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders the linked projects stat card and an empty-roadmap notice in the populated state", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products");
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: { id: 42, name: "Payments Platform", key: "PAY", description: null, vision: null },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    (useProjects as jest.Mock).mockReturnValue({
      data: { data: [], hasMore: false },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(screen.getByText("Linked projects")).toBeInTheDocument();
    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    expect(screen.getByText(/no roadmap items for this product yet/i)).toBeInTheDocument();
  });

  it("renders linked project names when projects exist", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products");
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: { id: 42, name: "Payments Platform", key: "PAY", description: null, vision: null },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    (useProjects as jest.Mock).mockReturnValue({
      data: {
        data: [
          { id: 1, name: "Checkout Service", key: "CS-1", status: "ACTIVE" },
          { id: 2, name: "Auth Module", key: "AM-1", status: "ACTIVE" },
        ],
        hasMore: false,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(screen.getByText("Checkout Service")).toBeInTheDocument();
    expect(screen.getByText("Auth Module")).toBeInTheDocument();
  });

  it("scopes goals to this product so the count is never an org-wide total", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products");
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: { id: 42, name: "Payments Platform", key: "PAY", description: null, vision: null },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { useGoalsPage } = jest.requireMock("@/hooks/api/goals");

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(useGoalsPage).toHaveBeenCalledWith({ managedProductId: 42 });
  });

  it("scopes the roadmap to this product rather than claiming the roadmap is unavailable", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products");
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: { id: 42, name: "Payments Platform", key: "PAY", description: null, vision: null },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { useRoadmapItems } = jest.requireMock("@/hooks/api/build/roadmap");

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(useRoadmapItems).toHaveBeenCalledWith({ managedProductId: 42, limit: 5 });
    expect(screen.queryByText(/not yet available/i)).not.toBeInTheDocument();
  });

  it("shows the server's filtered goal total, not the length of one capped page", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products");
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: { id: 42, name: "Payments Platform", key: "PAY", description: null, vision: null },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { useGoalsPage } = jest.requireMock("@/hooks/api/goals");
    (useGoalsPage as jest.Mock).mockReturnValue({
      data: { items: [{ id: 1 }, { id: 2 }], page: 1, pageSize: 20, total: 137 },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(screen.getByText("137")).toBeInTheDocument();
  });

  it("shows the exact linked-project aggregate instead of presenting the first cursor page as the total", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useManagedProduct, useManagedProductInsights } = jest.requireMock(
      "@/hooks/api/build/managed-products",
    );
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: { id: 42, name: "Payments Platform", key: "PAY", description: null, vision: null },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    (useManagedProductInsights as jest.Mock).mockReturnValue({
      data: { linkedProjectCount: 37 },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    (useProjects as jest.Mock).mockReturnValue({
      data: {
        data: Array.from({ length: 10 }, (_, index) => ({
          id: index + 1,
          name: `Project ${index + 1}`,
          key: `P-${index + 1}`,
          status: "ACTIVE",
        })),
        hasMore: true,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(useManagedProductInsights).toHaveBeenCalledWith(42);
    expect(screen.getByText("37")).toBeInTheDocument();
    expect(screen.queryByText("10+")).not.toBeInTheDocument();
  });

  it("renders feedback stat card from insights feedbackByStatus so the core feedback field is visible on the overview (BSN-MP-01)", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useManagedProduct, useManagedProductInsights } = jest.requireMock(
      "@/hooks/api/build/managed-products",
    );
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: { id: 42, name: "Payments Platform", key: "PAY", description: null, vision: null, status: "active", updatedAt: "2024-11-01T00:00:00Z" },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    (useManagedProductInsights as jest.Mock).mockReturnValue({
      data: {
        linkedProjectCount: 3,
        feedbackByStatus: { open: 4, planned: 2, in_progress: 1, completed: 5, declined: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(screen.getByText("Feedback")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
  });

  it("renders status and updated date in the subtitle so core fields are visible without opening a sub-page (BSN-MP-02)", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products");
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: {
        id: 42,
        name: "Payments Platform",
        key: "PAY",
        description: null,
        vision: null,
        status: "active",
        updatedAt: "2024-11-01T10:30:00Z",
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(screen.getByText(/active/)).toBeInTheDocument();
    expect(screen.getByText(/updated 2024-11-01/)).toBeInTheDocument();
  });

  it("renders the error state when the resolution reports an error", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("Load failed") });

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("passes the first erroring query error to usePageState so a 402 plan-upgrade or 403 response is not silently degraded", () => {
    const networkError = new Error("MODULE_NOT_ENABLED");
    const { useManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products");
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: networkError,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "error", error: networkError });

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ error: networkError }),
    );
  });
});

describe("ManagedProductOverviewPage — URL-backed search (BSN-OVW-Q)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePageState.mockReturnValue({ kind: "ready" });

    const { useManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products");
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: { id: 42, name: "Payments Platform", key: "PAY", description: null, vision: null },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
  });

  it("passes undefined search to useProjects when no q param in URL so all linked projects are shown by default", () => {
    const { useBuildListFilters } = jest.requireMock("@/features/build/shared/use-build-list-filters");
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn(() => undefined),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
    });

    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ search: undefined }),
      expect.anything(),
    );
  });

  it("forwards the q URL param as search to useProjects so the linked projects preview is filtered server-side", () => {
    const { useBuildListFilters } = jest.requireMock("@/features/build/shared/use-build-list-filters");
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn((key: string) => (key === "q" ? "checkout" : undefined)),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
    });

    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ search: "checkout" }),
      expect.anything(),
    );
  });
});

describe("ManagedProductOverviewPage — keyboard navigation (BSN-OVW-KB)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePageState.mockReturnValue({ kind: "ready" });

    const { useManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products");
    (useManagedProduct as jest.Mock).mockReturnValue({
      data: { id: 42, name: "Payments Platform", key: "PAY", description: null, vision: null },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    (useProjects as jest.Mock).mockReturnValue({
      data: {
        data: [
          { id: 10, name: "Checkout Service", key: "CS-1", status: "ACTIVE" },
          { id: 11, name: "Auth Module", key: "AM-1", status: "ACTIVE" },
        ],
        hasMore: false,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
  });

  it("wires useBuildListKeyboard with linked project count so j/k/Enter navigate the preview rows", () => {
    const { useBuildListKeyboard } = jest.requireMock("@/features/build/shared/use-build-list-keyboard");

    render(<ManagedProductOverviewPage managedProductId={42} />);

    expect(useBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ itemCount: 2 }),
    );
  });

  it("marks the keyboard-focused row with aria-selected so screen readers can announce position in the list", () => {
    const { useBuildListKeyboard } = jest.requireMock("@/features/build/shared/use-build-list-keyboard");
    (useBuildListKeyboard as jest.Mock).mockReturnValue({
      focusedIndex: 0,
      setFocusedIndex: jest.fn(),
    });

    render(<ManagedProductOverviewPage managedProductId={42} />);

    const rows = screen.getAllByRole("generic", { hidden: true }).filter(
      (el) => el.getAttribute("aria-selected") !== null,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveAttribute("aria-selected", "true");
  });
});
