import { render, screen } from "@testing-library/react";
import { CursorPageControls } from "./cursor-page-controls";

describe("CursorPageControls", () => {
  it("adapts legacy cursor callers to the shared icon-only pagination footer", () => {
    render(
      <CursorPageControls
        page={2}
        hasNext
        onPrevious={() => {}}
        onNext={() => {}}
        pageSize={25}
        onPageSizeChange={() => {}}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(screen.getByLabelText("Previous page")).not.toHaveTextContent("Previous");
    expect(screen.getByLabelText("Next page")).not.toHaveTextContent("Next");
    expect(screen.getByLabelText("Current page 2")).toHaveTextContent("2");
    expect(screen.getByLabelText("Rows per page")).toHaveClass("h-8");
    expect(screen.queryByText("1 result shown")).not.toBeInTheDocument();
  });
});
