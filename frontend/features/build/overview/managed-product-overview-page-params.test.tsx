import { render, screen } from "@testing-library/react";
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

jest.mock("@/features/build/managed-products/managed-product-form-sheet", () => ({
  ManagedProductFormSheet: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  usePageState.mockReturnValue({ kind: "ready" });
});

function mockPeriod(period: string | undefined) {
  const { useBuildListFilters } = jest.requireMock(
    "@/features/build/shared/use-build-list-filters",
  );
  (useBuildListFilters as jest.Mock).mockReturnValue({
    value: jest.fn((key: string) => (key === "period" ? period : undefined)),
    setValue: jest.fn(),
    isActive: jest.fn((key: string) => key === "period" && period !== undefined),
    clearAll: jest.fn(),
    isFiltered: period !== undefined,
  });
}

describe("ManagedProductOverviewPage — period URL param forwarded to summary hook (BSN-OVW-PERIOD-URL)", () => {
  it("passes period=30d to useManagedProductSummary when the URL param is 30d", () => {
    mockPeriod("30d");
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(42, "30d");
  });

  it("passes period=90d to useManagedProductSummary when the URL param is 90d", () => {
    mockPeriod("90d");
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(42, "90d");
  });

  it("passes period=365d to useManagedProductSummary when the URL param is 365d", () => {
    mockPeriod("365d");
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(42, "365d");
  });

  it("passes period=all to useManagedProductSummary when the URL param is all", () => {
    mockPeriod("all");
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(42, "all");
  });

  it("passes undefined period when the URL param is absent so the backend uses its default", () => {
    mockPeriod(undefined);
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(42, undefined);
  });

  it("ignores an unrecognised period value so the backend cannot receive an invalid enum", () => {
    mockPeriod("7d");
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(42, undefined);
  });

  it("renders the Period filter control so the URL param is reachable without editing the URL", () => {
    mockPeriod(undefined);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByLabelText("Period")).toBeInTheDocument();
  });
});
