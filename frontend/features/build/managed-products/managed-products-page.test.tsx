import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ManagedProductsPage } from "./managed-products-page";

const mockRouterPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: mockRouterPush }),
  usePathname: () => "/build/managed-products",
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

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProducts: jest.fn(),
  useCreateManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(() => ({ data: { data: [] } })),
}));

jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: () => ({ open: false, onOpenChange: jest.fn(), setOpen: jest.fn() }),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
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
  CONTENT_FILL_PANEL: "",
  PM_TOOLBAR: "",
}));

jest.mock("@/components/shared", () => ({
  NoPermissionState: ({ permission }: { permission: string }) => (
    <div data-testid="no-permission" data-permission={permission} />
  ),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({
    data,
    getRowKey,
    onRowClick,
  }: {
    data?: Array<{ name?: string; id?: unknown }>;
    getRowKey?: (row: { name?: string; id?: unknown }, i: number) => string | number;
    onRowClick?: (row: { name?: string; id?: unknown }) => void;
  }) => {
    if (!data || data.length === 0) return <div data-testid="data-table" />;
    return (
      <div data-testid="data-table">
        {data.map((row, i) => {
          const key = getRowKey ? String(getRowKey(row, i)) : String(i);
          return onRowClick ? (
            <button key={key} type="button" onClick={() => onRowClick(row)}>
              {row.name}
            </button>
          ) : (
            <span key={key}>{row.name}</span>
          );
        })}
      </div>
    );
  },
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("./managed-product-form-sheet", () => ({
  ManagedProductFormSheet: () => null,
}));

jest.mock("./managed-product-bulk-toolbar", () => ({
  ManagedProductBulkToolbar: () => <div data-testid="managed-product-bulk-toolbar" />,
  MANAGED_PRODUCT_BULK_MAX: 100,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const { useManagedProducts } = jest.requireMock("@/hooks/api/build/managed-products") as {
  useManagedProducts: jest.Mock;
};
const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};
const { useCan } = jest.requireMock("@/hooks/api/access") as {
  useCan: jest.Mock;
};

const EMPTY_RESULT = {
  data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 20 } },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(true);
  usePageState.mockReturnValue({ kind: "ready" });
  useManagedProducts.mockReturnValue(EMPTY_RESULT);
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
