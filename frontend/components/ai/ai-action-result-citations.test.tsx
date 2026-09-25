import { render, screen } from "@testing-library/react";
import { AiActionResultBody, type AiActionResultState } from "./ai-action-result-body";

function readyWith(citations?: { id: number; title: string }[]): AiActionResultState {
  return {
    status: "ready",
    result: { text: "The drafted answer.", ...(citations ? { citations } : {}) },
  };
}

describe("AiActionResultBody — citations survive the contentOnly branch", () => {
  it("renders the source chips when the result carries citations", () => {
    render(
      <AiActionResultBody
        state={readyWith([
          { id: 7, title: "Employee handbook" },
          { id: 9, title: "Onboarding guide" },
        ])}
        contentOnly
        expectsCitations
      />,
    );

    expect(screen.getByText("The drafted answer.")).toBeInTheDocument();
    expect(screen.getByText("Employee handbook")).toBeInTheDocument();
    expect(screen.getByText("Onboarding guide")).toBeInTheDocument();
  });

  it("renders the draft alone when the result carries no citations", () => {
    render(<AiActionResultBody state={readyWith()} contentOnly expectsCitations />);

    expect(screen.getByText("The drafted answer.")).toBeInTheDocument();
    expect(screen.queryByText("Employee handbook")).toBeNull();
  });

  it("still renders chips on the carded branch so the two branches agree", () => {
    render(
      <AiActionResultBody state={readyWith([{ id: 7, title: "Employee handbook" }])} />,
    );

    expect(screen.getByText("Employee handbook")).toBeInTheDocument();
  });
});
