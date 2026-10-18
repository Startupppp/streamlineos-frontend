import { render, screen } from "@testing-library/react";
import { DEFAULT_DATA } from "../lib/constants";
import { DISPLAY_NAME_MAX_LENGTH } from "../lib/basics-schema";
import { StepWorkspace } from "./step-workspace";

function renderStep(displayName: string) {
  return render(
    <StepWorkspace
      data={{ ...DEFAULT_DATA, displayName }}
      patch={jest.fn()}
      onBack={jest.fn()}
      onNext={jest.fn()}
      isFirstStep
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
});
