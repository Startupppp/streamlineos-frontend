import { render, screen } from "@testing-library/react";
import { ManagedProductOverviewPage } from "./managed-product-overview-page";
import { OVERVIEW_SUMMARY } from "./managed-product-overview-test-fixtures";

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
    isFiltered: false,
  })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => usePageState(...args),
}));

jest.mock("@/hooks/api/build/managed-product-summary", () => ({
  useManagedProductSummary: jest.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    dataUpdatedAt: 0,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/build/managed-product-mutations", () => ({
  useUpdateManagedProduct: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/build/teams", () => ({
  useProjectTeams: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/features/build/managed-products/managed-product-form-sheet", () => ({
  ManagedProductFormSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="managed-product-edit-sheet" /> : null,
}));

jest.mock("@/features/build/managed-products/insights/opportunity-create-sheet", () => ({
  OpportunityCreateSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="opportunity-create-sheet" /> : null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  usePageState.mockReturnValue({ kind: "ready" });
  const { useManagedProductSummary } = jest.requireMock("@/hooks/api/build/managed-product-summary");
  (useManagedProductSummary as jest.Mock).mockReturnValue({
    data: OVERVIEW_SUMMARY,
    isLoading: false,
    isError: false,
    error: null,
    dataUpdatedAt: 0,
    refetch: jest.fn(),
  });
});

describe("ManagedProductOverviewPage — offline state (BSN-OVW-OFFLINE)", () => {
  const onlineSpy = jest.spyOn(navigator, "onLine", "get");

  afterEach(() => {
    onlineSpy.mockReturnValue(true);
  });

  it("renders no offline notice while online", () => {
    onlineSpy.mockReturnValue(true);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.queryByTestId("offline-notice")).not.toBeInTheDocument();
  });

  it("shows freshness rather than blanking the overview when the browser goes offline", () => {
    onlineSpy.mockReturnValue(false);
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: OVERVIEW_SUMMARY,
      dataUpdatedAt: Date.now(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByTestId("offline-notice")).toHaveTextContent(/Offline — showing data/);
  });

  it("withdraws the edit action while offline", () => {
    onlineSpy.mockReturnValue(false);
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(true);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.queryAllByRole("button", { name: /Edit product/i })).toHaveLength(0);
  });
});
