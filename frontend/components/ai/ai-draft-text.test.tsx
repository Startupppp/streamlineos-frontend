import { render, screen } from "@testing-library/react";
import { AiDraftText } from "./ai-draft-text";

describe("AiDraftText", () => {
  it("renders dash-prefixed lines as a list instead of a crushed paragraph", () => {
    render(
      <AiDraftText text={"- First point\n- Second point\n- Third point"} />,
    );

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("First point")).toBeInTheDocument();
    expect(screen.getByText("Second point")).toBeInTheDocument();
  });

  it("keeps ordinary prose as a paragraph", () => {
    render(<AiDraftText text="A single rewritten draft." />);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByText("A single rewritten draft.")).toBeInTheDocument();
  });
});
