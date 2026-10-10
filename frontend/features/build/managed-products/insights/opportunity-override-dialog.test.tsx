import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OpportunityOverrideDialog } from "./opportunity-override-dialog";

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

    await user.type(screen.getByTestId("override-score-input"), "6.25");
    await user.type(screen.getByTestId("override-reason-input"), "Q3 NPS signals");
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
