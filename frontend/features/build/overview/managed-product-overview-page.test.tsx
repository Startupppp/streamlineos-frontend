import { fireEvent, render, screen, within } from "@testing-library/react";
import { ManagedProductOverviewPage } from "./managed-product-overview-page";
import { OVERVIEW_SUMMARY } from "./managed-product-overview-test-fixtures";

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

const mockMutateProduct = jest.fn();

jest.mock("@/hooks/api/build/managed-product-mutations", () => ({
  useUpdateManagedProduct: jest.fn(() => ({ mutate: mockMutateProduct, isPending: false })),
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

jest.mock("@/features/build/managed-products/link-existing-goal-dialog", () => ({
  LinkExistingGoalDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="link-goal-dialog" /> : null,
}));

jest.mock("./managed-product-update-dialog", () => ({
  ManagedProductUpdateDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="post-update-dialog" /> : null,
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
  it("places the compact product pulse first in the content below the filters", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const pulse = screen.getByRole("region", { name: "Product pulse" });

    expect(pulse.parentElement?.firstElementChild).toBe(pulse);
    const pulseGrid = pulse.querySelector("[data-slot=stat-card-grid]");
    expect(pulseGrid).toHaveClass("gap-2", "overflow-x-auto");
    expect(pulseGrid).not.toHaveClass("grid-cols-2");
    expect(within(pulse).getAllByRole("link")).toHaveLength(5);
  });

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
    ).toHaveAttribute("href", "/build/managed-products/42/feedback?ret=%2Fbuild%2Fmanaged-products%2F42");
  });

  it("renders icons on overview section actions without changing their accessible names", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);

    const insightsLink = screen.getByRole("link", { name: "Open insights" });
    expect(insightsLink.querySelector("[data-slot=overview-section-link-icon]")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View feedback" })).toHaveAccessibleName("View feedback");
    expect(screen.getByRole("link", { name: "View roadmap" })).toHaveAccessibleName("View roadmap");
    expect(screen.getByRole("link", { name: "View goals" })).toHaveAccessibleName("View goals");
  });

  it("links delivery section to the roadmap page", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(
      screen.getByRole("link", { name: /view roadmap/i }),
    ).toHaveAttribute("href", "/build/managed-products/42/roadmap?ret=%2Fbuild%2Fmanaged-products%2F42");
  });
});

describe("ManagedProductOverviewPage — owner display in subtitle (FE-85)", () => {
  it("renders the resolved owner name, never the raw ownerId", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: {
        ...OVERVIEW_SUMMARY,
        product: {
          ...OVERVIEW_SUMMARY.product,
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

describe("ManagedProductOverviewPage — product identity", () => {
  it("stretches identity and attention into an equal-height overview row", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getByTestId("overview-identity-attention-grid")).toHaveClass("items-stretch");
  });

  it("keeps strategy, ownership, schedule, phase, lifecycle and labels visible in the compact surface", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: {
        ...OVERVIEW_SUMMARY,
        product: {
          ...OVERVIEW_SUMMARY.product,
          vision: "Make every payment feel instant",
          description: "A dependable platform for global checkout.",
          owner: { id: "u-1", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", image: null },
          targetLaunchDate: "2026-11-20",
          currentPhase: "Private beta",
          segments: ["Enterprise"],
          tags: ["payments"],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });

    render(<ManagedProductOverviewPage managedProductId={42} />);
    const identity = screen.getByRole("region", { name: "Product identity" });
    expect(within(identity).getByText("Make every payment feel instant")).toBeInTheDocument();
    expect(within(identity).getByText("A dependable platform for global checkout.")).toBeInTheDocument();
    expect(within(identity).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(identity).getByText("Private beta")).toBeInTheDocument();
    expect(within(identity).getByRole("list", { name: "Lifecycle stage" })).toBeInTheDocument();
    expect(within(identity).getByRole("list", { name: "Segments and tags" })).toHaveTextContent(
      "Enterprise#payments",
    );
  });
});

describe("ManagedProductOverviewPage — error handling", () => {
  it("renders the error state when the resolution reports an error", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("Load failed") });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const errorState = screen.getByRole("alert");
    expect(errorState).toBeInTheDocument();
    expect(errorState).toHaveClass("flex-1");
    expect(errorState).not.toHaveClass("flex-none");
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

describe("ManagedProductOverviewPage — record opportunity", () => {
  it("opens the create sheet from the primary header action", () => {
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(true);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Record opportunity/i })[0]!);
    expect(screen.getByTestId("opportunity-create-sheet")).toBeInTheDocument();
  });

  it("offers no record action to a viewer without update permission", () => {
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(false);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.queryAllByRole("button", { name: /Record opportunity/i })).toHaveLength(0);
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

describe("ManagedProductOverviewPage — mark reviewed", () => {
  it("records today's review against the current product version", () => {
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(true);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Mark reviewed/i })[0]!);
    expect(mockMutateProduct).toHaveBeenCalledWith(
      expect.objectContaining({ managedProductId: 42, version: 1, lastReviewedAt: expect.any(String) }),
      expect.anything(),
    );
  });

  it("shows the review action with an icon while keeping its accessible name", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const review = screen.getByRole("button", { name: /Mark reviewed/i });
    expect(review.querySelector("svg")).toBeInTheDocument();
  });

  it("offers no review action to a viewer who cannot update the product", () => {
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(false);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.queryAllByRole("button", { name: /Mark reviewed/i })).toHaveLength(0);
  });
});

describe("ManagedProductOverviewPage — link goal action (audit #14)", () => {
  it("exposes the More actions overflow button so link-goal is reachable when the user can edit", () => {
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(true);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.getAllByRole("button", { name: /More actions/i }).length).toBeGreaterThan(0);
  });

  it("offers no actions at all to a viewer without update permission so link-goal is also absent", () => {
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(false);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.queryAllByRole("button", { name: /More actions/i })).toHaveLength(0);
    expect(screen.queryByTestId("link-goal-dialog")).not.toBeInTheDocument();
  });
});

describe("ManagedProductOverviewPage — post product update action (audit #14)", () => {
  it("opens the post-update dialog when the Post update action is triggered", () => {
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(true);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Post update/i })[0]!);
    expect(screen.getByTestId("post-update-dialog")).toBeInTheDocument();
  });

  it("offers no post-update action to a viewer without update permission", () => {
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(false);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.queryAllByRole("button", { name: /Post update/i })).toHaveLength(0);
  });

  it("hides edit/post-update when server allowedActions does not include update (archived product)", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: {
        ...OVERVIEW_SUMMARY,
        product: { ...OVERVIEW_SUMMARY.product, status: "archived", allowedActions: ["view", "restore", "delete"] },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });
    const { useCan } = jest.requireMock("@/hooks/api/access");
    (useCan as jest.Mock).mockReturnValue(true);
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(screen.queryAllByRole("button", { name: /Post update/i })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: /Edit product/i })).toHaveLength(0);
  });
});

describe("ManagedProductOverviewPage — needs attention", () => {
  it("flags the missing owner and the unreviewed product with links to fix them", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const panel = screen.getByRole("region", { name: "Needs attention" });
    expect(within(panel).getByText("No product owner")).toBeInTheDocument();
    expect(within(panel).getByText("Product has never been reviewed")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /Assign owner/i })).toHaveAttribute(
      "href",
      "/build/managed-products/42/settings",
    );
    expect(within(panel).getByRole("link", { name: /Define strategy/i })).toHaveAttribute(
      "href",
      "/build/managed-products/42/settings",
    );
    expect(within(panel).getByRole("link", { name: /Theme feedback/i })).toHaveAttribute(
      "href",
      "/build/managed-products/42/feedback",
    );
    expect(within(panel).getByRole("button", { name: /Mark reviewed/i })).toBeEnabled();
  });

  it("walks the signal-to-outcome stages in order with their counts", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const stages = within(screen.getByRole("list", { name: "Signal to outcome" })).getAllByRole("link");
    expect(stages.map((stage) => stage.textContent)).toEqual([
      expect.stringContaining("Feedback12"),
      expect.stringContaining("Themed6"),
      expect.stringContaining("Opportunities2"),
      expect.stringContaining("On roadmap19"),
      expect.stringContaining("Shipped4"),
      expect.stringContaining("Measured1"),
    ]);
  });
});

describe("ManagedProductOverviewPage — overview href params match destination filter keys", () => {
  it("last-30-days feedback link uses from/to date params, not period, so the feedback page filter hook reads it", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const allLinks = screen.getAllByRole("link");
    const last30dLink = allLinks.find((l) => {
      const href = l.getAttribute("href") ?? "";
      return href.startsWith("/build/managed-products/42/feedback?") && href.includes("from=");
    });
    expect(last30dLink).toBeDefined();
    const href = last30dLink!.getAttribute("href") ?? "";
    const url = new URL(href, "http://localhost");
    expect(url.searchParams.has("from")).toBe(true);
    expect(url.searchParams.has("to")).toBe(true);
    expect(url.searchParams.has("period")).toBe(false);
    expect(url.searchParams.get("from")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(url.searchParams.get("to")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("opportunities fact links to the insights page so the insights filter hook is the authority", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const allLinks = screen.getAllByRole("link");
    const opportunityLink = allLinks.find((l) => {
      const url = new URL(l.getAttribute("href") ?? "", "http://localhost");
      return url.pathname === "/build/managed-products/42/insights" && url.search === "";
    });
    expect(opportunityLink).toBeDefined();
  });

  it("goals linked fact links to the goals page with no unrecognised filter params", () => {
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const allLinks = screen.getAllByRole("link");
    const goalsLink = allLinks.find((l) => {
      const url = new URL(l.getAttribute("href") ?? "", "http://localhost");
      return url.pathname === "/build/managed-products/42/goals" && url.search === "";
    });
    expect(goalsLink).toBeDefined();
  });

  it("theme links from the evidence card use the theme param that the feedback filter hook reads", () => {
    const { useManagedProductSummary } = jest.requireMock(
      "@/hooks/api/build/managed-product-summary",
    );
    (useManagedProductSummary as jest.Mock).mockReturnValue({
      data: {
        ...OVERVIEW_SUMMARY,
        previews: {
          ...OVERVIEW_SUMMARY.previews,
          themes: [{ theme: "Performance", count: 4 }],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    });
    render(<ManagedProductOverviewPage managedProductId={42} />);
    const themeLinks = screen
      .getAllByRole("link")
      .filter((l) => (l.getAttribute("href") ?? "").includes("/feedback?theme="));
    expect(themeLinks.length).toBeGreaterThan(0);
    themeLinks.forEach((link) => {
      const url = new URL(link.getAttribute("href") ?? "", "http://localhost");
      expect(url.searchParams.has("theme")).toBe(true);
    });
  });
});
