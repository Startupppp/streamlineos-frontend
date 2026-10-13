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
    setValues: jest.fn(),
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

jest.mock("@/features/build/managed-products/link-existing-goal-dialog", () => ({
  LinkExistingGoalDialog: () => null,
}));

jest.mock("./managed-product-update-dialog", () => ({
  ManagedProductUpdateDialog: () => null,
}));

jest.mock("@/features/build/managed-products/managed-product-form-sheet", () => ({
  ManagedProductFormSheet: () => null,
}));

jest.mock("@/features/build/managed-products/insights/opportunity-create-sheet", () => ({
  OpportunityCreateSheet: () => null,
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
    expect(useManagedProductSummary).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ period: "30d" }),
    );
  });

  it("passes period=90d to useManagedProductSummary when the URL param is 90d", () => {
    mockPeriod("90d");
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ period: "90d" }),
    );
  });

  it("passes period=365d to useManagedProductSummary when the URL param is 365d", () => {
    mockPeriod("365d");
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ period: "365d" }),
    );
  });

  it("passes period=all to useManagedProductSummary when the URL param is all", () => {
    mockPeriod("all");
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ period: "all" }),
    );
  });

  it("passes undefined period when the URL param is absent so the backend uses its default", () => {
    mockPeriod(undefined);
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ period: undefined }),
    );
  });

  it("ignores an unrecognised period value so the backend cannot receive an invalid enum", () => {
    mockPeriod("7d");
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ period: undefined }),
    );
  });

  it("drops a non-numeric team id and a whitespace segment before the summary request", () => {
    const { useBuildListFilters } = jest.requireMock(
      "@/features/build/shared/use-build-list-filters",
    );
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn((key: string) => {
        if (key === "teamId") return "abc";
        if (key === "segment") return "   ";
        return undefined;
      }),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
      isFiltered: true,
    });
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ teamId: undefined, segment: undefined }),
    );
  });

  it("forwards a positive team id and a trimmed segment", () => {
    const { useBuildListFilters } = jest.requireMock(
      "@/features/build/shared/use-build-list-filters",
    );
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn((key: string) => {
        if (key === "teamId") return "12";
        if (key === "segment") return "  enterprise  ";
        return undefined;
      }),
      setValue: jest.fn(),
      isActive: jest.fn(() => true),
      clearAll: jest.fn(),
      isFiltered: true,
    });
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ teamId: 12, segment: "enterprise" }),
    );
  });

  it("renders the Period filter control so the URL param is reachable without editing the URL", () => {
    mockPeriod(undefined);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByLabelText("Period")).toBeInTheDocument();
  });
});

describe("ManagedProductOverviewPage — from/to date URL params forwarded to summary hook (BSN-OVW-DATE-RANGE)", () => {
  function mockDateRange(from: string | undefined, to: string | undefined) {
    const { useBuildListFilters } = jest.requireMock(
      "@/features/build/shared/use-build-list-filters",
    );
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn((key: string) => {
        if (key === "from") return from;
        if (key === "to") return to;
        return undefined;
      }),
      setValue: jest.fn(),
      setValues: jest.fn(),
      isActive: jest.fn((key: string) => {
        if (key === "from") return from !== undefined;
        if (key === "to") return to !== undefined;
        return false;
      }),
      clearAll: jest.fn(),
      isFiltered: from !== undefined || to !== undefined,
    });
  }

  it("passes from and to to useManagedProductSummary when both URL params are valid ISO dates", () => {
    mockDateRange("2026-01-01", "2026-12-31");
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ from: "2026-01-01", to: "2026-12-31" }),
    );
  });

  it("passes undefined from and to when URL params are absent", () => {
    mockDateRange(undefined, undefined);
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ from: undefined, to: undefined }),
    );
  });

  it("omits an invalid from date so a non-date string never reaches the backend", () => {
    mockDateRange("not-a-date", undefined);
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useManagedProductSummary).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ from: undefined }),
    );
  });
});
