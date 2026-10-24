import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmWithReasonSheet } from "./confirm-with-reason-sheet";

function renderSheet() {
  return render(
    <ConfirmWithReasonSheet
      open
      onOpenChange={jest.fn()}
      title="Void this envelope?"
      reasonRequired
      reasonErrorMessage="A reason is required to void an envelope."
      confirmLabel="Void envelope"
      onConfirm={jest.fn()}
    />,
  );
}

describe("a required reason only complains after the user has typed", () => {
  it("opens without an error, even when focus leaves the field before any typing", () => {
    renderSheet();
    fireEvent.blur(screen.getByRole("textbox"));

    expect(screen.queryByText("A reason is required to void an envelope.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Void envelope" })).toBeDisabled();
  });

  it("shows the error once the user types and then clears the reason", () => {
    renderSheet();
    const field = screen.getByRole("textbox");
    fireEvent.change(field, { target: { value: "replaced" } });
    fireEvent.change(field, { target: { value: "  " } });

    expect(screen.getByText("A reason is required to void an envelope.")).toBeInTheDocument();
  });

  it("enables the confirm button once there is a reason", () => {
    renderSheet();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "replaced by v2" } });

    expect(screen.getByRole("button", { name: "Void envelope" })).toBeEnabled();
  });
});
