import { render, screen } from "@testing-library/react";
import { ManagedProductOverviewPage } from "./managed-product-overview-page";

const usePageState = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/managed-products/42",
  useSearchParams: () => new URLSearchParams(),
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
