import { fireEvent, render, screen } from "@testing-library/react";
import { KnowledgeGapCard } from "./knowledge-gap-card";
import type { KnowledgeGap } from "@/features/support/lib/knowledge-gap.types";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

const { useCan } = jest.requireMock("@/hooks/api/access") as {
  useCan: jest.Mock;
};

function makeGap(overrides: Partial<KnowledgeGap> = {}): KnowledgeGap {
  return {
    id: 7,
    orgId: "org-1",
    representativeQuestion: "How do I get a refund?",
    ticketCount: 4,
    sampleTicketIds: [1, 2],
    status: "OPEN",
    proposedArticleId: null,
    dismissalReason: null,
    draftedBy: null,
    reviewedBy: null,
    evidence: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    deflectionCount: 0,
    proposedArticleTitle: null,
    ...overrides,
  };
}

function renderCard(
  gap: KnowledgeGap,
  onDismiss: (gapId: number, reason?: string) => void = jest.fn(),
) {
  return render(
    <KnowledgeGapCard
      gap={gap}
      onDraft={jest.fn()}
      onDismiss={onDismiss}
      isDrafting={false}
      isDismissing={false}
    />,
  );
}

beforeEach(() => {
  useCan.mockReturnValue(true);
});

describe("KnowledgeGapCard — the dismissal reason", () => {
  it("shows the stored reason on a dismissed gap, because otherwise the only trace of the decision is the word DISMISSED", () => {
    renderCard(
      makeGap({
        status: "DISMISSED",
        dismissalReason: "Covered by the refund policy article",
      }),
    );

    expect(
      screen.getByText("Covered by the refund policy article"),
    ).toBeInTheDocument();
  });

  it("shows no reason block on an open gap, so the assertion above is about the dismissed state and not about the card always rendering it", () => {
    renderCard(makeGap({ status: "OPEN", dismissalReason: null }));

    expect(screen.queryByText("Dismissed because")).not.toBeInTheDocument();
  });

  it("shows no reason block on a gap dismissed without one, rather than an empty labelled section", () => {
    renderCard(makeGap({ status: "DISMISSED", dismissalReason: null }));

    expect(screen.queryByText("Dismissed because")).not.toBeInTheDocument();
  });
});

describe("KnowledgeGapCard — dismissing", () => {
  it("confirms before dismissing instead of firing on the icon click, because dismissal is a lifecycle decision the list offers no undo for", () => {
    const onDismiss = jest.fn();
    renderCard(makeGap(), onDismiss);

    fireEvent.click(screen.getByLabelText("Dismiss knowledge gap"));

    expect(onDismiss).not.toHaveBeenCalled();
    expect(
      screen.getByText("Dismiss this knowledge gap?"),
    ).toBeInTheDocument();
  });

  it("sends the typed reason with the dismissal, because the column exists so a reviewer can read why", () => {
    const onDismiss = jest.fn();
    renderCard(makeGap(), onDismiss);

    fireEvent.click(screen.getByLabelText("Dismiss knowledge gap"));
    fireEvent.change(screen.getByLabelText("Reason (optional)"), {
      target: { value: "  Covered by the refund policy article  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss gap" }));

    expect(onDismiss).toHaveBeenCalledWith(
      7,
      "Covered by the refund policy article",
    );
  });

  it("sends no reason when the box is left blank, so an optional field does not arrive as an empty string the backend would reject", () => {
    const onDismiss = jest.fn();
    renderCard(makeGap(), onDismiss);

    fireEvent.click(screen.getByLabelText("Dismiss knowledge gap"));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss gap" }));

    expect(onDismiss).toHaveBeenCalledWith(7, undefined);
  });

  it("offers no dismiss control to a caller without the manage permission, and the control above proves the assertion can fail", () => {
    useCan.mockReturnValue(false);
    renderCard(makeGap());

    expect(
      screen.queryByLabelText("Dismiss knowledge gap"),
    ).not.toBeInTheDocument();
  });
});
