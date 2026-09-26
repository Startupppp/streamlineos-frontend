import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ManagedProductsPage } from "./managed-products-page";

const mockRouterPush = jest.fn();
const mockSetCreateOpen = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: mockRouterPush }),
  usePathname: () => "/build/managed-products",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(() => ({ data: { data: [] } })),
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

jest.mock("@/hooks/api/build", () => ({
  useManagedProducts: jest.fn(),
  useCreateManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useBulkUpdateManagedProducts: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: () => ({
    open: false,
    onOpenChange: jest.fn(),
    setOpen: mockSetCreateOpen,
  }),
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
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/shared", () => ({
  NoPermissionState: ({ permission }: { permission: string }) => (
    <div data-testid="no-permission" data-permission={permission} />
  ),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("./managed-product-form-sheet", () => ({
  ManagedProductFormSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="managed-product-form-sheet" /> : null,
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

const { useManagedProducts } = jest.requireMock("@/hooks/api/build") as {
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

describe("ManagedProductsPage — c shortcut (C3 BSN-KB-MP-01)", () => {
  it("c key calls the create handler to initiate creating a managed product when build:managed-products:create is granted", () => {
    render(<ManagedProductsPage />);
    fireEvent.keyDown(document, { key: "c" });
    expect(mockSetCreateOpen).toHaveBeenCalledTimes(1);
  });

  it("c key does not fire the create handler when create permission is denied", () => {
    useCan.mockImplementation((key: string) => key !== "build:managed-products:create");
    render(<ManagedProductsPage />);
    fireEvent.keyDown(document, { key: "c" });
    expect(mockSetCreateOpen).not.toHaveBeenCalled();
  });
});

describe("ManagedProductsPage — states (C3 BSN-STATE-MP-01)", () => {
  it("loading state renders the table skeleton so layout does not shift on load", () => {
    usePageState.mockReturnValue({ kind: "loading" });
    render(<ManagedProductsPage />);
    expect(screen.getByTestId("page-state-loading")).toBeInTheDocument();
    expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
  });

  it("error state is rendered so a backend failure is not silently swallowed", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("server error") });
    render(<ManagedProductsPage />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });

  it("denied state does not render the data table so cross-tenant row counts are not leaked", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ManagedProductsPage />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });

  it("empty state is rendered inside the page state so filtered-empty is distinct from ready", () => {
    usePageState.mockReturnValue({ kind: "empty" });
    render(<ManagedProductsPage />);
    expect(screen.getByTestId("page-state-empty")).toBeInTheDocument();
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("ready state renders the data table", () => {
    render(<ManagedProductsPage />);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });
});

describe("ManagedProductsPage — URL params forwarded to hook (C3 BSN-FILTER-MP-01)", () => {
  it("passes the status param from URL to useManagedProducts so server-side filtering applies", () => {
    render(<ManagedProductsPage />);
    expect(useManagedProducts).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined }),
    );
  });

  it("passes page size to useManagedProducts for bounded pagination (C4)", () => {
    render(<ManagedProductsPage />);
    expect(useManagedProducts).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20 }),
    );
  });
});
