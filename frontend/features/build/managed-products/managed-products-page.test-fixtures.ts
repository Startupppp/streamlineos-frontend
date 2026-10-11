import React from "react";

export const mockRouterPush = jest.fn();
export const mockUseBuildListFilters = jest.fn();

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
    if (resolution.kind === "loading") return React.createElement("div", { "data-testid": "page-state-loading" }, loading);
    if (resolution.kind === "denied")
      return React.createElement("div", {
        "data-testid": "no-permission",
        "data-permission": resolution.permission ?? "",
      });
    if (resolution.kind === "error") return React.createElement("div", { "data-testid": "error-state" });
    if (resolution.kind === "empty") return React.createElement("div", { "data-testid": "page-state-empty" }, empty);
    return React.createElement("div", { "data-testid": "page-state-ready" }, children);
  },
}));

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProducts: jest.fn(),
  useManagedProductFacets: jest.fn(() => ({ data: { segments: [], tags: [] } })),
  useCreateManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useArchiveManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRestoreManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: jest.fn(() => ({ data: { data: [] } })),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(() => ({ data: { data: [] } })),
}));
jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: jest.fn(() => ({ data: { data: [] } })),
}));

jest.mock("@/hooks/api/build/teams", () => ({
  useProjectTeams: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: jest.fn(() => ({ open: false, onOpenChange: jest.fn(), setOpen: jest.fn() })),
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
  }) => React.createElement("div", null, actions, filters, children),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  PmSection: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  CONTENT_FILL_PANEL: "",
  PM_TOOLBAR: "",
}));

jest.mock("@/components/shared", () => ({
  NoPermissionState: ({ permission }: { permission: string }) =>
    React.createElement("div", { "data-testid": "no-permission", "data-permission": permission }),
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
    if (!data || data.length === 0) return React.createElement("div", { "data-testid": "data-table" });
    return React.createElement(
      "div",
      { "data-testid": "data-table" },
      ...data.map((row, i) => {
        const key = getRowKey ? String(getRowKey(row, i)) : String(i);
        return onRowClick
          ? React.createElement("button", { key, type: "button", onClick: () => onRowClick(row) }, row.name)
          : React.createElement("span", { key }, row.name);
      }),
    );
  },
  DataTableSkeleton: () => React.createElement("div", { "data-testid": "data-table-skeleton" }),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => React.createElement("div", { "data-testid": "empty-state" }),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("./managed-product-form-sheet", () => ({
  ManagedProductFormSheet: jest.fn(),
}));

jest.mock("./managed-product-bulk-toolbar", () => ({
  ManagedProductBulkToolbar: () => React.createElement("div", { "data-testid": "managed-product-bulk-toolbar" }),
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

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: (...args: unknown[]) => mockUseBuildListFilters(...args),
  BUILD_FILTER_ALL: "all",
}));

export const { useManagedProducts } = jest.requireMock<{
  useManagedProducts: jest.Mock;
}>("@/hooks/api/build/managed-products");
export const { usePageState } = jest.requireMock<{
  usePageState: jest.Mock;
}>("@/hooks/api/use-page-state");
export const { useCan } = jest.requireMock<{
  useCan: jest.Mock;
}>("@/hooks/api/access");
export const { ManagedProductFormSheet } = jest.requireMock<{
  ManagedProductFormSheet: jest.Mock;
}>("./managed-product-form-sheet");
export const { useCreateManagedProduct, useDeleteManagedProduct } = jest.requireMock<{
  useCreateManagedProduct: jest.Mock;
  useDeleteManagedProduct: jest.Mock;
}>(
  "@/hooks/api/build/managed-products",
);
export const { toast } = jest.requireMock<{
  toast: { success: jest.Mock; error: jest.Mock };
}>("sonner");
export const { useQueryParamOpen } = jest.requireMock<{
  useQueryParamOpen: jest.Mock;
}>("@/hooks/common/use-query-param-open");

export const EMPTY_RESULT = {
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

beforeEach(() => {
  mockUseBuildListFilters.mockReturnValue({
    value: (_param: string) => "all",
    isActive: (_param: string) => false,
    setValue: jest.fn(),
    clearAll: jest.fn(),
    search: "",
    debouncedSearch: "",
    setSearch: jest.fn(),
    resetKey: "status=all&sort=all&ownerId=all&q=",
    isPending: false,
    isFiltered: false,
    activeCount: 0,
    cursor: null,
    setCursor: jest.fn(),
  });
});
