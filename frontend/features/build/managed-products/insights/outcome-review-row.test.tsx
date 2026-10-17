import { render, screen } from "@testing-library/react";
import { OutcomeReviewRow } from "./outcome-review-row";

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

const MANAGED_PRODUCT_ID = 7;

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    managedProductId: MANAGED_PRODUCT_ID,
    opportunityId: null,
    roadmapItemId: null,
    goalId: null,
    releaseId: null,
    kind: "outcome_review" as const,
    title: "Q1 Revenue Review",
    hypothesis: null,
    metric: null,
    unit: null,
    baseline: null,
    target: null,
    actual: null,
    scheduledFor: null,
    completedAt: null,
    measureKind: "self_reported" as const,
    metricPeriod: null,
    sourceUrl: null,
    measuredAt: null,
    state: "scheduled" as const,
    result: null,
    notes: null,
    ownerMembershipId: null,
    version: 1,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00+00:00",
    updatedAt: "2026-01-01T00:00:00+00:00",
    ...overrides,
  };
}

describe("OutcomeReviewRow — metric fields", () => {
  it("uses compact, consistently styled icon actions with accessible tooltip labels", () => {
    render(
      <OutcomeReviewRow
        review={makeReview()}
        managedProductId={MANAGED_PRODUCT_ID}
        canWrite
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Complete review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete review" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
    expect(screen.getByTestId("outcome-review-row-1")).toHaveClass("px-3", "py-2.5");
  });

  it("renders metric, baseline, target and actual when all are present", () => {
    const review = makeReview({
      metric: "Revenue",
      unit: "USD",
      baseline: "100000",
      target: "120000",
      actual: "115000",
    });
    render(
      <OutcomeReviewRow
        review={review}
        managedProductId={MANAGED_PRODUCT_ID}
        canWrite={false}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText("Metric")).toBeInTheDocument();
    expect(screen.getByText("Revenue (USD)")).toBeInTheDocument();
    expect(screen.getByText("Baseline")).toBeInTheDocument();
    expect(screen.getByText("100000")).toBeInTheDocument();
    expect(screen.getByText("Target")).toBeInTheDocument();
    expect(screen.getByText("120000")).toBeInTheDocument();
    expect(screen.getByText("Actual")).toBeInTheDocument();
    expect(screen.getByTestId("actual-1")).toHaveTextContent("115000");
  });

  it("omits the metrics section when no metric fields are present", () => {
    const review = makeReview();
    render(
      <OutcomeReviewRow
        review={review}
        managedProductId={MANAGED_PRODUCT_ID}
        canWrite={false}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("metrics-1")).not.toBeInTheDocument();
  });
});

describe("OutcomeReviewRow — freshness label", () => {
  it("shows Measured today for measuredAt = now", () => {
    const now = new Date().toISOString();
    const review = makeReview({ measureKind: "measured", measuredAt: now });
    render(
      <OutcomeReviewRow
        review={review}
        managedProductId={MANAGED_PRODUCT_ID}
        canWrite={false}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByTestId("freshness-1")).toHaveTextContent("Measured today");
  });

  it("shows Measured N days ago for a past measuredAt", () => {
    const past = new Date(Date.now() - 5 * 86_400_000).toISOString();
    const review = makeReview({ measureKind: "measured", measuredAt: past });
    render(
      <OutcomeReviewRow
        review={review}
        managedProductId={MANAGED_PRODUCT_ID}
        canWrite={false}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByTestId("freshness-1")).toHaveTextContent("Measured 5 days ago");
  });

  it("omits freshness when measuredAt is null", () => {
    const review = makeReview({ measuredAt: null });
    render(
      <OutcomeReviewRow
        review={review}
        managedProductId={MANAGED_PRODUCT_ID}
        canWrite={false}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("freshness-1")).not.toBeInTheDocument();
  });
});

describe("OutcomeReviewRow — source record linking", () => {
  it("renders an internal opportunity link when opportunityId is set", () => {
    const review = makeReview({ opportunityId: 42 });
    render(
      <OutcomeReviewRow
        review={review}
        managedProductId={MANAGED_PRODUCT_ID}
        canWrite={false}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    const link = screen.getByTestId("source-record-link-1");
    expect(link).toHaveAttribute(
      "href",
      `/build/managed-products/${MANAGED_PRODUCT_ID}/insights?view=discovery&opportunity=42`,
    );
  });

  it("renders an internal roadmap item link when roadmapItemId is set", () => {
    const review = makeReview({ roadmapItemId: 10 });
    render(
      <OutcomeReviewRow
        review={review}
        managedProductId={MANAGED_PRODUCT_ID}
        canWrite={false}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    const link = screen.getByTestId("source-record-link-1");
    expect(link).toHaveAttribute(
      "href",
      `/build/managed-products/${MANAGED_PRODUCT_ID}/roadmap?item=10`,
    );
  });

  it("renders an internal goal link when goalId is set", () => {
    const review = makeReview({ goalId: 99 });
    render(
      <OutcomeReviewRow
        review={review}
        managedProductId={MANAGED_PRODUCT_ID}
        canWrite={false}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    const link = screen.getByTestId("source-record-link-1");
    expect(link).toHaveAttribute(
      "href",
      `/build/managed-products/${MANAGED_PRODUCT_ID}/goals?goal=99`,
    );
  });

  it("falls back to external sourceUrl when no source record id is set", () => {
    const review = makeReview({ sourceUrl: "https://example.com/data" });
    render(
      <OutcomeReviewRow
        review={review}
        managedProductId={MANAGED_PRODUCT_ID}
        canWrite={false}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("source-record-link-1")).not.toBeInTheDocument();
    const extLink = screen.getByTestId("source-url-link-1");
    expect(extLink).toHaveAttribute("href", "https://example.com/data");
  });

  it("shows no source link when neither source record ids nor sourceUrl are set", () => {
    const review = makeReview();
    render(
      <OutcomeReviewRow
        review={review}
        managedProductId={MANAGED_PRODUCT_ID}
        canWrite={false}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("source-record-link-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("source-url-link-1")).not.toBeInTheDocument();
  });

  it("prefers the source record link over sourceUrl when both are present", () => {
    const review = makeReview({
      opportunityId: 5,
      sourceUrl: "https://example.com/data",
    });
    render(
      <OutcomeReviewRow
        review={review}
        managedProductId={MANAGED_PRODUCT_ID}
        canWrite={false}
        onComplete={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByTestId("source-record-link-1")).toBeInTheDocument();
    expect(screen.queryByTestId("source-url-link-1")).not.toBeInTheDocument();
  });
});
