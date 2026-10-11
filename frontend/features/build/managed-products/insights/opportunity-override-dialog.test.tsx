import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OpportunityDeclineDialog, OpportunityOverrideDialog } from "./opportunity-override-dialog";
import { OpportunityScoreDialog } from "./opportunity-rice-form";

const noop = jest.fn();

describe("OpportunityOverrideDialog — reason required (BSN-OVERRIDE-REQUIRED)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("blocks submission and shows a validation error when reason is empty so the override audit trail is never empty", async () => {
    const user = userEvent.setup();
    render(
      <OpportunityOverrideDialog
        open
        onOpenChange={noop}
        expectedScoreVersion={1}
        isSubmitting={false}
        onOverride={noop}
      />,
    );

    await user.type(screen.getByTestId("override-score-input"), "4.5");
    fireEvent.click(screen.getByRole("button", { name: /save override/i }));

    await waitFor(() => {
      expect(screen.getByTestId("override-reason-error")).toBeInTheDocument();
    });
    expect(noop).not.toHaveBeenCalledWith(expect.objectContaining({ reason: expect.anything() }));
  });

  it("calls onOverride with the reason when both fields are provided so the mutation receives a complete payload", async () => {
    const handleOverride = jest.fn();
    const user = userEvent.setup();

    render(
      <OpportunityOverrideDialog
        open
        onOpenChange={noop}
        expectedScoreVersion={3}
        isSubmitting={false}
        onOverride={handleOverride}
      />,
    );

    await user.type(screen.getByLabelText("Override score"), "6.25");
    await user.type(screen.getByLabelText("Reason (required)"), "Q3 NPS signals");
    fireEvent.click(screen.getByRole("button", { name: /save override/i }));

    await waitFor(() => {
      expect(handleOverride).toHaveBeenCalledWith(
        expect.objectContaining({
          overrideScore: 6.25,
          reason: "Q3 NPS signals",
          expectedScoreVersion: 3,
        }),
        expect.any(Object),
      );
    });
  });

  it("does not call onOverride when reason is whitespace only so a blank audit reason is prevented", async () => {
    const handleOverride = jest.fn();
    const user = userEvent.setup();

    render(
      <OpportunityOverrideDialog
        open
        onOpenChange={noop}
        expectedScoreVersion={2}
        isSubmitting={false}
        onOverride={handleOverride}
      />,
    );

    await user.type(screen.getByTestId("override-score-input"), "3");
    await user.type(screen.getByTestId("override-reason-input"), "   ");
    fireEvent.click(screen.getByRole("button", { name: /save override/i }));

    await waitFor(() => {
      expect(screen.getByTestId("override-reason-error")).toBeInTheDocument();
    });
    expect(handleOverride).not.toHaveBeenCalled();
  });
});

describe("OpportunityDeclineDialog — reason required (BSN-DECLINE-NOTE)", () => {
  it("does not call onDecline when the reason is blank so the server never receives an empty note", async () => {
    const handleDecline = jest.fn();
    render(<OpportunityDeclineDialog open onOpenChange={noop} isSubmitting={false} onDecline={handleDecline} />);
    fireEvent.click(screen.getByRole("button", { name: /^decline$/i }));
    await waitFor(() => expect(screen.getByText("Add a reason for declining")).toBeInTheDocument());
    expect(handleDecline).not.toHaveBeenCalled();
  });

  it("calls onDecline with the typed reason so the decision note is persisted", async () => {
    const handleDecline = jest.fn();
    const user = userEvent.setup();
    render(<OpportunityDeclineDialog open onOpenChange={noop} isSubmitting={false} onDecline={handleDecline} />);
    await user.type(screen.getByLabelText("Reason"), "Out of scope for this year");
    fireEvent.click(screen.getByRole("button", { name: /^decline$/i }));
    await waitFor(() =>
      expect(handleDecline).toHaveBeenCalledWith({ note: "Out of scope for this year" }, expect.any(Object)),
    );
  });
});

describe("OpportunityScoreDialog — RICE scoring (BSN-RICE-SCORE)", () => {
  it("previews the same score the server computes and submits the entered RICE inputs", async () => {
    const handleScore = jest.fn();
    const user = userEvent.setup();
    render(
      <OpportunityScoreDialog open onOpenChange={noop} expectedScoreVersion={2} isSubmitting={false} onScore={handleScore} />,
    );
    await user.type(screen.getByPlaceholderText("e.g. 500"), "1200");
    expect(screen.getByTestId("rice-score-value")).toHaveTextContent("960.00");
    fireEvent.click(screen.getByRole("button", { name: /save score/i }));
    await waitFor(() =>
      expect(handleScore).toHaveBeenCalledWith(
        expect.objectContaining({ reach: "1200", impact: 1, confidence: 0.8, effort: 1, expectedScoreVersion: 2 }),
        expect.any(Object),
      ),
    );
  });

  it("does not submit when reach is empty so an unscored opportunity is never saved as a score", async () => {
    const handleScore = jest.fn();
    render(
      <OpportunityScoreDialog open onOpenChange={noop} expectedScoreVersion={0} isSubmitting={false} onScore={handleScore} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save score/i }));
    await waitFor(() => expect(screen.getByText("Reach is required")).toBeInTheDocument());
    expect(handleScore).not.toHaveBeenCalled();
  });
});
