import "./managed-products-page.test-fixtures";
import { fireEvent, render, screen } from "@testing-library/react";
import { ManagedProductsPage } from "./managed-products-page";
import {
  mockRouterPush,
  mockUseBuildListFilters,
  useManagedProducts,
  usePageState,
} from "./managed-products-page.test-fixtures";

describe("ManagedProductsPage — BUG-053: ownerId sentinel not forwarded to hook", () => {
  it("calls useManagedProducts with ownerId undefined when no owner filter is in the URL so all products are returned instead of filtering by the literal string 'all'", () => {
    render(<ManagedProductsPage />);
    expect(useManagedProducts).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: undefined }),
    );
  });

  it("does not pass the BUILD_FILTER_ALL sentinel as ownerId to useManagedProducts so the backend predicate is never evaluated against an impossible owner_id value", () => {
    render(<ManagedProductsPage />);
    const calls = useManagedProducts.mock.calls;
    for (const [args] of calls) {
      expect((args as { ownerId?: string }).ownerId).not.toBe("all");
    }
  });
});

describe("ManagedProductsPage — usePageState integration (BSN-01-027)", () => {
  it("calls usePageState with build:managed-products:view permission so 402 errors get classified correctly", () => {
    render(<ManagedProductsPage />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:managed-products:view" }),
    );
  });

  it("shows NoPermissionState when build:managed-products:view is denied", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ManagedProductsPage />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("passes build:managed-products:view as the permission key in denied resolution", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ManagedProductsPage />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "build:managed-products:view",
    );
  });

  it("navigates to product detail on Enter after j selects the first row so keyboard users can open a product without a mouse", () => {
    const products = [
      { id: 42, name: "Alpha Service", key: "ALPHA-001", status: "active" as const, ownerId: null, description: null, orgId: "org-1", vision: null, missionStatement: null, targetCustomer: null, differentiators: null, currentPhase: null, targetLaunchDate: null, successMetrics: null, ownerMembershipId: null, deletedAt: null, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
    ];
    useManagedProducts.mockReturnValue({
      data: { data: products, pagination: { hasMore: false, nextCursor: null, limit: 20 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });
    render(<ManagedProductsPage />);

    fireEvent.keyDown(document, { key: "j" });
    fireEvent.keyDown(document, { key: "Enter" });

    expect(mockRouterPush).toHaveBeenCalledWith("/build/managed-products/42");
  });

  it("displays hook data without additional client-side filtering (BSN-FE-MP-001)", () => {
    const products = [
      { id: 1, name: "Alpha Service", key: "ALPHA-001", status: "active", ownerId: null, description: null, orgId: "org-1", vision: null, missionStatement: null, targetCustomer: null, differentiators: null, currentPhase: null, targetLaunchDate: null, successMetrics: null, ownerMembershipId: null, deletedAt: null, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
      { id: 2, name: "Beta Platform", key: "BETA-002", status: "active", ownerId: null, description: null, orgId: "org-1", vision: null, missionStatement: null, targetCustomer: null, differentiators: null, currentPhase: null, targetLaunchDate: null, successMetrics: null, ownerMembershipId: null, deletedAt: null, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
    ];
    useManagedProducts.mockReturnValue({
      data: { data: products, pagination: { hasMore: false, nextCursor: null, limit: 20 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });
    render(<ManagedProductsPage />);
    expect(screen.getByText("Alpha Service")).toBeInTheDocument();
    expect(screen.getByText("Beta Platform")).toBeInTheDocument();
  });
});

describe("ManagedProductsPage — filter round-trip (BT-d1f0e28c8509)", () => {
  it("passes status=active to useManagedProducts when the status filter param is active so server-side filtering applies", () => {
    mockUseBuildListFilters.mockReturnValue({
      value: (param: string) => (param === "status" ? "active" : "all"),
      isActive: (param: string) => param === "status",
      setValue: jest.fn(),
      clearAll: jest.fn(),
      search: "",
      debouncedSearch: "",
      setSearch: jest.fn(),
      resetKey: "status=active&sort=all&ownerId=all&q=",
      isPending: false,
      isFiltered: true,
      activeCount: 1,
      cursor: null,
      setCursor: jest.fn(),
    });
    render(<ManagedProductsPage />);
    expect(useManagedProducts).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" }),
    );
  });
});

describe("ManagedProductsPage — URL stability (BT-d1f0e28c8509)", () => {
  it("navigation URL uses product id not name after rename so bookmarks and deep links remain valid", () => {
    const productId = 77;
    const product = {
      id: productId,
      name: "Original Name",
      key: "PROD-077",
      status: "active" as const,
      ownerId: null,
      description: null,
      orgId: "org-1",
      vision: null,
      missionStatement: null,
      targetCustomer: null,
      differentiators: null,
      currentPhase: null,
      targetLaunchDate: null,
      successMetrics: null,
      ownerMembershipId: null,
      deletedAt: null,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    };
    useManagedProducts.mockReturnValue({
      data: { data: [product], pagination: { hasMore: false, nextCursor: null, limit: 20 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    const { rerender } = render(<ManagedProductsPage />);

    useManagedProducts.mockReturnValue({
      data: {
        data: [{ ...product, name: "Renamed Name" }],
        pagination: { hasMore: false, nextCursor: null, limit: 20 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    rerender(<ManagedProductsPage />);

    fireEvent.keyDown(document, { key: "j" });
    fireEvent.keyDown(document, { key: "Enter" });

    expect(mockRouterPush).toHaveBeenCalledWith(`/build/managed-products/${productId}`);
    expect(mockRouterPush).not.toHaveBeenCalledWith(expect.stringContaining("Original Name"));
    expect(mockRouterPush).not.toHaveBeenCalledWith(expect.stringContaining("Renamed Name"));
  });
});
