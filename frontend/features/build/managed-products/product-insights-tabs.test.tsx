import "./product-scope-pages.test-harness";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductInsightsPage } from "./product-insights-page";
import {
  mockRouterReplace,
  mockUseSearchParams,
  render,
  screen,
  useManagedProductInsights,
} from "./product-scope-pages.test-harness";

jest.mock("@/lib/person-display", () => ({
  getUserDisplayName: ({ firstName, lastName }: { firstName?: string | null; lastName?: string | null }) =>
    [firstName, lastName].filter(Boolean).join(" ") || "Unknown",
}));

describe("ProductInsightsPage — section tabs", () => {
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
    mockRouterReplace.mockClear();
    useManagedProductInsights.mockReturnValue({
      data: insightsData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("opens on Overview with the summary sections and no second tab row", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    render(<ProductInsightsPage managedProductId={7} />);
    const views = screen.getByRole("tablist", { name: "Insights views" });
    expect(within(views).getByRole("tab", { name: "Overview" })).toHaveAttribute("data-state", "active");
    expect(within(views).getByRole("tab", { name: "Discovery" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Delivery" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Feedback" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Where to focus" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delivery coverage" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Customer response" })).toBeInTheDocument();
    expect(screen.queryByTestId("product-discovery-section")).not.toBeInTheDocument();
    expect(screen.getByTestId("page-wrapper-actions").querySelector('[aria-label="Range"]')).toBeInTheDocument();
  });

  it("keeps an old section link on Overview and ignores an unknown tab", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("tab=delivery"));
    const { unmount } = render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByRole("heading", { name: "Evidence linked to the roadmap" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Delivery" })).not.toBeInTheDocument();
    unmount();

    mockUseSearchParams.mockReturnValue(new URLSearchParams("tab=nope"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(within(screen.getByRole("tablist", { name: "Insights views" })).getByRole("tab", { name: "Overview" })).toHaveAttribute("data-state", "active");
  });

  it("mounts discovery only on the Discovery tab", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("tab=discovery"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(screen.getByTestId("product-discovery-section")).toHaveTextContent("Discovery 7");
    expect(screen.queryByRole("heading", { name: "Where to focus" })).not.toBeInTheDocument();
  });

  it("opens Discovery without the page range", async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("range=7d"));
    const user = userEvent.setup();
    const { unmount } = render(<ProductInsightsPage managedProductId={7} />);
    await user.click(within(screen.getByRole("tablist", { name: "Insights views" })).getByRole("tab", { name: "Discovery" }));
    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/build/managed-products/7/goals?range=7d&view=discovery",
      { scroll: false },
    );
    unmount();

    mockUseSearchParams.mockReturnValue(new URLSearchParams("view=discovery"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(within(screen.getByRole("tablist", { name: "Insights views" })).getByRole("tab", { name: "Discovery" })).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("product-discovery-section")).toHaveTextContent("Discovery 7");
    expect(screen.queryByRole("heading", { name: "Where to focus" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Delivery" })).not.toBeInTheDocument();
    expect(screen.getByTestId("page-wrapper-actions").querySelector('[aria-label="Range"]')).not.toBeInTheDocument();
  });

  it("keeps the range when the insights query is scoped", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("range=7d"));
    render(<ProductInsightsPage managedProductId={7} />);
    expect(useManagedProductInsights).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ range: "7d" }),
    );
  });
});
