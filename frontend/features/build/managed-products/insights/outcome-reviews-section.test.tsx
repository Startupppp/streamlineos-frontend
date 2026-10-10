import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OutcomeReviewsSection } from "./outcome-reviews-section";
import type { DiscoveryReviewsListOutcomeReviewsResponse } from "@/contracts/build-contracts.generated";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

type ReviewRow = DiscoveryReviewsListOutcomeReviewsResponse["data"][number];

const SCHEDULED_REVIEW: ReviewRow = {
  id: 1,
  managedProductId: 10,
  opportunityId: 5,
  roadmapItemId: null,
  goalId: null,
  releaseId: null,
  kind: "outcome_review",
  title: "NPS impact review",
  state: "scheduled",
  result: null,
  hypothesis: null,
  metric: null,
  unit: null,
  baseline: null,
  target: null,
  actual: null,
  notes: null,
  ownerMembershipId: null,
  scheduledFor: null,
  completedAt: null,
  version: 1,
  createdBy: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

const noop = jest.fn();

describe("OutcomeReviewsSection — result required (BSN-OUTCOME-RESULT)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the complete button for a scheduled review so users can record outcomes", () => {
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[SCHEDULED_REVIEW]}
        isLoading={false}
        onCreate={noop}
        onComplete={noop}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );

    expect(screen.getByTestId("complete-review-btn-1")).toBeInTheDocument();
  });

  it("blocks submission and shows a validation error when result is absent so outcome reviews always carry a result", async () => {
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[SCHEDULED_REVIEW]}
        isLoading={false}
        onCreate={noop}
        onComplete={noop}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );

    fireEvent.click(screen.getByTestId("complete-review-btn-1"));
    fireEvent.click(screen.getByRole("button", { name: /^complete$/i }));

    await waitFor(() => {
      expect(screen.getByTestId("result-error")).toBeInTheDocument();
    });
    expect(noop).not.toHaveBeenCalledWith(expect.objectContaining({ result: expect.anything() }));
  });

  it("shows the empty state when no reviews are present", () => {
    render(
      <OutcomeReviewsSection
        managedProductId={10}
        reviews={[]}
        isLoading={false}
        onCreate={noop}
        onComplete={noop}
        onDelete={noop}
        isCreating={false}
        isUpdating={false}
      />,
    );

    expect(screen.getByTestId("outcome-reviews-empty")).toBeInTheDocument();
  });
});
