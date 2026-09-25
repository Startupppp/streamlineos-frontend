import { render, screen } from "@testing-library/react";
import { SourceBadge } from "./source-badge";

describe("SourceBadge", () => {
  it("names the source of a knowledge-base entry that is not a wiki page", () => {
    render(<SourceBadge kind="hr-document" />);

    expect(screen.getByText("HR document")).toBeInTheDocument();
  });

  it("merges a caller's className instead of replacing the badge's own", () => {
    const { container } = render(<SourceBadge kind="hr-document" className="ml-2" />);

    expect(container.firstElementChild).toHaveClass("ml-2", "rounded-md");
  });
});
