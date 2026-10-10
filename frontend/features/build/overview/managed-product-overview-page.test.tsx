import { fireEvent, render, screen } from "@testing-library/react";
import { ManagedProductOverviewPage } from "./managed-product-overview-page";

const usePageState = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockRouterReplace, push: jest.fn() }),
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

jest.mock("@/hooks/api/build/teams", () => ({
  useProjectTeams: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/features/build/managed-products/managed-product-form-sheet", () => ({
  ManagedProductFormSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="managed-product-edit-sheet" /> : null,
}));

const FULL_SUMMARY = {
  product: {
    id: 42,
    orgId: "org-1",
    name: "Payments Platform",
    key: "PAY",
    description: null,
    status: "active" as const,
    ownerId: null,
    vision: null,
    missionStatement: null,
    targetCustomer: null,
    differentiators: null,
    currentPhase: null,
    targetLaunchDate: null,
    successMetrics: null,
    ownerMembershipId: null,
    lifecycle: "growth",
    health: "on_track",
    teamId: null,
    segments: [],
    tags: [],
    northStarMetric: null,
    lastReviewedAt: null,
    owner: null,
    version: 1,
    deletedAt: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  evidence: {
    feedbackCount: 12,
    feedbackLast30d: 3,
    themedCount: 6,
    latestFeedbackAt: null,
    opportunityCount: 2,
    opportunitiesByState: { open: 1, exploring: 1 },
  },
  delivery: {
    linkedProjects: 3,
    roadmapByHorizon: { now: 2, next: 5, later: 8 },
    roadmapCompleted: 4,
    ticketTotals: { total: 20, done: 10 },
    nextRelease: null,
  },
  outcomes: {
    goalsLinked: 2,
    outcomeReviews: { scheduled: 3, completed: 1, met: 1, notMet: 0 },
    latestReviewAt: null,
  },
  previews: {
    themes: [],
    roadmap: [],
    releases: [],
    opportunities: [],
  },
  generatedAt: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  usePageState.mockReturnValue({ kind: "ready" });
  const { useManagedProductSummary } = jest.requireMock(
    "@/hooks/api/build/managed-product-summary",
  );
  (useManagedProductSummary as jest.Mock).mockReturnValue({
    data: FULL_SUMMARY,
    isLoading: false,
    isError: false,
    error: null,
    dataUpdatedAt: 0,
    refetch: jest.fn(),
  });
});

describe("ManagedProductOverviewPage — loading skeleton", () => {
  it("shows the overview skeleton while the summary is loading", () => {
    usePageState.mockReturnValue({ kind: "loading" });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByTestId("managed-product-overview-skeleton")).toBeInTheDocument();
  });
});

describe("ManagedProductOverviewPage — access control", () => {
  it("renders access-restricted state when permission is denied so denial is never silently empty", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });
});

describe("ManagedProductOverviewPage — three distinct sections", () => {
  it("renders Evidence strength, Delivery progress, and Measured outcomes section headings", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByText("Evidence strength")).toBeInTheDocument();
    expect(screen.getByText("Delivery progress")).toBeInTheDocument();
    expect(screen.getByText("Measured outcomes")).toBeInTheDocument();
  });

  it("keeps Insights as the deep-dive by linking to the insights page from evidence", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(
      screen.getByRole("link", { name: /view feedback/i }),
    ).toHaveAttribute("href", "/build/managed-products/42/feedback");
  });

  it("links delivery section to the roadmap page", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(
      screen.getByRole("link", { name: /view roadmap/i }),
    ).toHaveAttribute("href", "/build/managed-products/42/roadmap");
  });
});

describe("ManagedProductOverviewPage — owner display in subtitle (FE-85)", () => {
  it("renders the resolved owner name, never the raw ownerId", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: {
        ...FULL_SUMMARY,
        product: {
          ...FULL_SUMMARY.product,
          ownerId: "7f3c1b2e-0000-4000-8000-000000000001",
          owner: { id: "7f3c1b2e-0000-4000-8000-000000000001", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", image: null },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByText(/Owner Ada Lovelace/)).toBeInTheDocument();
    expect(screen.queryByText(/7f3c1b2e/)).not.toBeInTheDocument();
  });

  it("shows Unassigned rather than blank when the product has no owner", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByText(/Owner Unassigned/)).toBeInTheDocument();
  });
});

describe("ManagedProductOverviewPage — error handling", () => {
  it("renders the error state when the resolution reports an error", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("Load failed") });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("passes the summary query error to usePageState so a 402 or 403 is not silently degraded", () => {
    const networkError = new Error("MODULE_NOT_ENABLED");
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: networkError,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "error", error: networkError });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ error: networkError }),
    );
  });

  it("summary failure shows the PageState error block rather than crashing silently", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error("network"),
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "error", error: new Error("network") });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("ManagedProductOverviewPage — edit action (BSN-OVW-EDIT)", () => {
  it("offers the edit action to a permitted viewer and opens the versioned edit sheet", () => {
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(true);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Edit product/i })[0]!);
    expect(screen.getByTestId("managed-product-edit-sheet")).toBeInTheDocument();
  });

  it("offers no edit action to a viewer without build:managed-products:update (FE-122 paired negative)", () => {
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(false);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.queryAllByRole("button", { name: /Edit product/i })).toHaveLength(0);
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
      data: FULL_SUMMARY,
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
