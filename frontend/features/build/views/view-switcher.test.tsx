import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewSwitcher } from "./view-switcher";

describe("ViewSwitcher", () => {
  it("renders segmented view buttons with black-and-white selected state", async () => {
    const user = userEvent.setup();
    const onViewChange = jest.fn();
    render(
      <ViewSwitcher
        activeView="board"
        onViewChange={onViewChange}
        allowedViews={["board", "list"] as const}
      />,
    );
    const board = screen.getByRole("button", { name: "Board" });
    const list = screen.getByRole("button", { name: "List" });
    expect(board).toHaveAttribute("aria-pressed", "true");
    expect(board.className).toMatch(/bg-foreground/);
    expect(list).toHaveAttribute("aria-pressed", "false");
    await user.click(list);
    expect(onViewChange).toHaveBeenCalledWith("list");
  });
});
