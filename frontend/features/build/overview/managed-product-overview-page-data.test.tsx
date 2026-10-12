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

jest.mock("@/features/build/managed-products/link-existing-goal-dialog", () => ({
  LinkExistingGoalDialog: () => null,
}));

jest.mock("./managed-product-update-sheet", () => ({
  ManagedProductUpdateSheet: () => null,
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
  const { useManagedProductSummary } = jest.requireMock(
    "@/hooks/api/build/managed-product-summary",
  );
  (useManagedProductSummary as jest.Mock).mockReturnValue({
    data: OVERVIEW_SUMMARY,
    isLoading: false,
    isError: false,
    error: null,
    dataUpdatedAt: 0,
    refetch: jest.fn(),
  });
});

describe("ManagedProductOverviewPage — absent sources show Unknown, not 0", () => {
  it("shows Unknown for latest feedback when latestFeedbackAt is null", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("shows Unknown for themed percentage when feedbackCount is zero", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: {
        ...OVERVIEW_SUMMARY,
        evidence: { ...OVERVIEW_SUMMARY.evidence, feedbackCount: 0, themedCount: 0 },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
  });

  it("shows Not measured yet for review freshness when latestReviewAt is null", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByText("Not measured yet")).toBeInTheDocument();
  });

  it("shows No linked work for ticket progress when total is zero", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: {
        ...OVERVIEW_SUMMARY,
        delivery: { ...OVERVIEW_SUMMARY.delivery, ticketTotals: { total: 0, done: 0 } },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByText("No linked work")).toBeInTheDocument();
  });

  it("shows Not measured yet for met/not met when no reviews completed", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: {
        ...OVERVIEW_SUMMARY,
        outcomes: {
          ...OVERVIEW_SUMMARY.outcomes,
          outcomeReviews: { scheduled: 2, completed: 0, met: 0, notMet: 0 },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getAllByText("Not measured yet").length).toBeGreaterThan(0);
  });
});

describe("ManagedProductOverviewPage — preview links carry ids", () => {
  it("links a roadmap preview item to the roadmap page with its horizon", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: {
        ...OVERVIEW_SUMMARY,
        previews: {
          ...OVERVIEW_SUMMARY.previews,
          roadmap: [{ id: 7, title: "Launch checkout", horizon: "now", status: "planned" }],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const link = screen.getByRole("link", { name: /Launch checkout/i });
    expect(link).toHaveAttribute("href", "/build/managed-products/42/roadmap?horizon=now");
  });

  it("links an opportunity preview to the insights page with its id", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: {
        ...OVERVIEW_SUMMARY,
        previews: {
          ...OVERVIEW_SUMMARY.previews,
          opportunities: [{ id: 99, title: "Reduce churn", state: "open", score: 0.8, scoreLabel: "High" }],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const link = screen.getByRole("link", { name: /Reduce churn/i });
    expect(link).toHaveAttribute("href", "/build/managed-products/42/insights?opportunity=99");
  });

  it("links a theme preview to the feedback page with the theme encoded", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: {
        ...OVERVIEW_SUMMARY,
        previews: {
          ...OVERVIEW_SUMMARY.previews,
          themes: [{ theme: "Payment friction", count: 5 }],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const link = screen.getByRole("link", { name: /Payment friction/i });
    expect(link.getAttribute("href")).toContain("/build/managed-products/42/feedback?theme=");
    expect(link.getAttribute("href")).toContain("Payment");
  });
});

describe("ManagedProductOverviewPage — strategy card", () => {
  it("shows Add strategy link to settings when strategy is absent and user can update", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByRole("link", { name: /Add strategy/i })).toHaveAttribute(
      "href",
      "/build/managed-products/42/settings",
    );
  });

  it("renders strategy section when missionStatement is present", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: {
        ...OVERVIEW_SUMMARY,
        product: { ...OVERVIEW_SUMMARY.product, missionStatement: "Enable seamless payments for all" },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByText("Enable seamless payments for all")).toBeInTheDocument();
  });
});
