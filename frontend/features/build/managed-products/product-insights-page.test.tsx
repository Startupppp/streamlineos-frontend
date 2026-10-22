import "./product-scope-pages.test-harness";
import { within } from "@testing-library/react";
import { ProductInsightsPage } from "./product-insights-page";
import {
  mockUseSearchParams,
  render,
  screen,
  useManagedProductInsights,
  usePageState,
} from "./product-scope-pages.test-harness";

jest.mock("@/lib/person-display", () => ({
  getUserDisplayName: ({ firstName, lastName }: { firstName?: string | null; lastName?: string | null }) =>
    [firstName, lastName].filter(Boolean).join(" ") || "Unknown",
}));

describe("ProductInsightsPage — usePageState integration (BSN-01-022)", () => {
  beforeEach(() => {
    useManagedProductInsights.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("calls usePageState with build:managed-products:view permission so 402 errors get classified correctly", () => {
    render(<ProductInsightsPage managedProductId={7} />);
    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:managed-products:view" }),
    );
  });

  it("shows NoPermissionState when build:managed-products:view is denied", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });

  it("passes build:managed-products:view as the permission key in denied resolution", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toHaveAttribute(
      "data-permission",
      "build:managed-products:view",
    );
  });
});

describe("ProductInsightsPage — page states (BSN-INS-STATE)", () => {
  beforeEach(() => {
    useManagedProductInsights.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("shows the loading skeleton when usePageState resolves to loading so layout does not shift on first paint", () => {
    usePageState.mockReturnValue({ kind: "loading" });
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByTestId("page-state-loading")).toBeInTheDocument();
    expect(screen.getByTestId("product-insights-skeleton")).toBeInTheDocument();
    expect(within(screen.getByRole("tablist", { name: "Insights views" })).getByRole("tab", { name: "Overview" })).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("heading", { name: "Where to focus" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Product context" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Delivery coverage" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Customer response" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Opportunities" })).not.toBeInTheDocument();
    expect(screen.getAllByTestId("stat-card")).toHaveLength(5);
  });

  it("shows the error state when usePageState resolves to error so the user can retry", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("network fail") });
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });
});

describe("ProductInsightsPage — unreachable product (MP-B-021)", () => {
  beforeEach(() => {
    useManagedProductInsights.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it.each(["not-found", "empty"] as const)(
    "renders only the shared product not-found state without the insights tabs when the read resolves to %s",
    (kind) => {
      usePageState.mockReturnValue({ kind });
      render(<ProductInsightsPage managedProductId={7} />);
      expect(screen.getByTestId("page-state-not-found")).toBeInTheDocument();
      expect(screen.queryByRole("tablist", { name: "Insights views" })).not.toBeInTheDocument();
    },
  );

  it("keeps the insights tabs for a reachable product", () => {
    usePageState.mockReturnValue({ kind: "ready" });
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.queryByTestId("page-state-not-found")).not.toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Insights views" })).toBeInTheDocument();
  });
});

describe("ProductInsightsPage — range URL param (BSN-INS-RANGE)", () => {
  beforeEach(() => {
    useManagedProductInsights.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("passes undefined range to useManagedProductInsights when no range param in URL so all-time data is shown by default", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    render(<ProductInsightsPage managedProductId={7} />);
    expect(useManagedProductInsights).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ range: undefined }),
    );
  });

  it("passes range=7d to useManagedProductInsights when URL has range=7d so the data is scoped to the last 7 days", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("range=7d"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(useManagedProductInsights).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ range: "7d" }),
    );
  });

  it("passes range=30d to useManagedProductInsights when URL has range=30d", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("range=30d"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(useManagedProductInsights).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ range: "30d" }),
    );
  });

  it("passes range=90d to useManagedProductInsights when URL has range=90d", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("range=90d"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(useManagedProductInsights).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ range: "90d" }),
    );
  });

  it("rejects an unknown range value and passes undefined so backend strict schema is not violated", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("range=invalid"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(useManagedProductInsights).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ range: undefined }),
    );
  });
});

describe("ProductInsightsPage — score override fields (BT-ae32e865907e)", () => {
  const baseInsightsData = {
    linkedProjectCount: 2,
    projectsByStatus: { active: 1, completed: 1, archived: 0 },
    submissionsByStatus: { open: 3, in_progress: 0, resolved: 1, archived: 0 },
    roadmapItemCount: 4,
    roadmapItemsByStatus: { planned: 2, in_progress: 1, completed: 1, cancelled: 0 },
    feedbackByStatus: { open: 5, planned: 1, in_progress: 0, completed: 0, declined: 0 },
    linkedFeedbackVoteCount: 12,
    ageDays: 8,
    confidenceScore: null,
    overrideReason: null,
    overriddenBy: null,
    overriddenAt: null,
  };

  it("does not render override-reason block when no override has been set so the section stays clean by default", () => {
    useManagedProductInsights.mockReturnValue({
      data: baseInsightsData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.queryByTestId("score-override-reason")).not.toBeInTheDocument();
  });

  it("renders override-reason block when confidence score was overridden so the audit trail is surfaced to authorized readers", () => {
    useManagedProductInsights.mockReturnValue({
      data: {
        ...baseInsightsData,
        confidenceScore: 85,
        overrideReason: "Strong NPS signals from Q3 beta",
        overriddenBy: { id: "user-1", firstName: "Ada", lastName: "Lovelace" },
        overriddenAt: "2026-10-01T12:00:00.000Z",
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProductInsightsPage managedProductId={7} />);
    const block = screen.getByTestId("score-override-reason");
    expect(block).toBeInTheDocument();
    expect(block).toHaveTextContent("Strong NPS signals from Q3 beta");
    expect(block).toHaveTextContent("Ada Lovelace");
  });
});

describe("ProductInsightsPage — insight counts (BT-6733af0a3e35 item 5)", () => {
  const insightsData = {
    linkedProjectCount: 1,
    projectsByStatus: { active: 1, completed: 0, archived: 0 },
    submissionsByStatus: { open: 5, in_progress: 2, resolved: 8, archived: 1 },
    roadmapItemCount: 3,
    roadmapItemsByStatus: { planned: 1, in_progress: 1, completed: 1, cancelled: 0 },
    feedbackByStatus: { open: 4, planned: 0, in_progress: 0, completed: 0, declined: 0 },
    linkedFeedbackVoteCount: 7,
    ageDays: 12,
    confidenceScore: null,
    overrideReason: null,
    overriddenBy: null,
    overriddenAt: null,
  };

  beforeEach(() => {
    useManagedProductInsights.mockReturnValue({
      data: insightsData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("shows feedback status counts without linking the cards", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("tab=feedback"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByText("Open: 5")).toBeInTheDocument();
    expect(screen.getByText("In progress: 2")).toBeInTheDocument();
    expect(screen.getByText("Resolved: 8")).toBeInTheDocument();
    expect(screen.getByText("Archived: 1")).toBeInTheDocument();
    expect(screen.queryByTestId("stat-card-link")).not.toBeInTheDocument();
  });

  it("puts the range selector in the page header and keeps the insights body scrollable", () => {
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByTestId("page-wrapper-actions").querySelector('[aria-label="Range"]')).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Insights views" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Delivery" })).not.toBeInTheDocument();
    expect(screen.getByTestId("pm-page-shell")).toHaveClass("overflow-visible");
  });

  it("shows delivery counts without linking the cards", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("tab=delivery"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByText("Linked projects: 1")).toBeInTheDocument();
    expect(screen.getByText("Active: 1")).toBeInTheDocument();
    expect(screen.getByText("Completed: 0")).toBeInTheDocument();
    expect(screen.getByText("Roadmap items: 3")).toBeInTheDocument();
    expect(screen.queryByTestId("stat-card-link")).not.toBeInTheDocument();
  });
});

