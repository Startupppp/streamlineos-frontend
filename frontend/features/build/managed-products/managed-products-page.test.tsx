import "./product-scope-pages.test-harness";
import { ManagedProductsPage } from "./managed-products-page";
import {
  EMPTY_MANAGED_PRODUCTS_RESULT,
  render,
  screen,
  useManagedProducts,
  usePageState,
} from "./product-scope-pages.test-harness";

describe("ManagedProductsPage — usePageState integration (BSN-01-027)", () => {
  beforeEach(() => {
    useManagedProducts.mockReturnValue(EMPTY_MANAGED_PRODUCTS_RESULT);
  });

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
