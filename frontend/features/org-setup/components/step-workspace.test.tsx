import { fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_DATA } from "../lib/constants";
import { DISPLAY_NAME_MAX_LENGTH } from "../lib/basics-schema";
import { StepWorkspace } from "./step-workspace";

function renderStep(displayName: string) {
  return render(
    <StepWorkspace
      data={{ ...DEFAULT_DATA, displayName }}
      patch={jest.fn()}
      onNext={jest.fn()}
    />,
  );
}

describe("StepWorkspace — workspace name limit", () => {
  it("shows no counter for a short name", () => {
    renderStep("Acme");

    expect(screen.queryByText(/characters$/)).not.toBeInTheDocument();
  });

  it("shows the character count as the name nears the limit so the cap is not silent", () => {
    renderStep("a".repeat(DISPLAY_NAME_MAX_LENGTH));

    expect(screen.getByText(`${DISPLAY_NAME_MAX_LENGTH}/${DISPLAY_NAME_MAX_LENGTH} characters`)).toBeInTheDocument();
  });

  it("stays on company details until contact and location fields are filled", () => {
    const onNext = jest.fn();
    render(
      <StepWorkspace data={{ ...DEFAULT_DATA, displayName: "Acme" }} patch={jest.fn()} onNext={onNext} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue to invitations" }));

    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a contact phone number.")).toBeInTheDocument();
    expect(screen.getByText("Select a country.")).toBeInTheDocument();
    expect(screen.getByText("Select a time zone.")).toBeInTheDocument();
  });

  it("continues to invitations with a valid contact and location", () => {
    const onNext = jest.fn();
    render(
      <StepWorkspace
        data={{ ...DEFAULT_DATA, displayName: "Acme", phone: "+919876543210", country: "IN", timezone: "Asia/Kolkata" }}
        patch={jest.fn()}
        onNext={onNext}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue to invitations" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
