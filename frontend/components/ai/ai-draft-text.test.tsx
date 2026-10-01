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

describe("AiDraftText — CHAT-S05 section labels in a bulleted draft", () => {
  const SUMMARY = [
    "**Key Points Discussed:**",
    "- Languages and formats were tested",
    "- A PNG attachment was shared",
    "**Action Items:**",
    "- Retest the files panel",
    "- Confirm the invitation flow",
  ].join("\n");

  it("does not eat one of a label's bold markers", () => {
    render(<AiDraftText text={SUMMARY} />);

    expect(screen.queryByText(/^\*Key Points Discussed:\*\*$/)).toBeNull();
    expect(screen.getByText("Key Points Discussed:")).toBeInTheDocument();
    expect(screen.getByText("Action Items:")).toBeInTheDocument();
  });

  it("renders a label as bold rather than as its markers", () => {
    const { container } = render(<AiDraftText text={SUMMARY} />);

    expect(container.textContent).not.toContain("*");
    expect(
      Array.from(container.querySelectorAll("strong")).map((el) => el.textContent),
    ).toEqual(["Key Points Discussed:", "Action Items:"]);
  });

  it("still strips the marker from a star-bulleted item", () => {
    render(<AiDraftText text={"* First point\n* Second point"} />);

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("First point")).toBeInTheDocument();
    expect(screen.getByText("Second point")).toBeInTheDocument();
  });

  it("renders a multi-line draft with no bullets as separate lines", () => {
    const { container } = render(
      <AiDraftText text={"**Summary:**\nOne decision was made."} />,
    );

    expect(container.querySelector("strong")?.textContent).toBe("Summary:");
    expect(container.textContent).toContain("One decision was made.");
  });
});
