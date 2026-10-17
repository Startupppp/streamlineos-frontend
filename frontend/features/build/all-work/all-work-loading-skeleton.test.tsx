import { render } from "@testing-library/react";
import {
  AllWorkSkeleton,
  AllWorkToolbarSkeleton,
} from "./all-work-view-switcher";

describe("All Work loading geometry", () => {
  it("mirrors the ready toolbar as search plus one horizontal controls row", () => {
    const { container } = render(<AllWorkToolbarSkeleton />);
    const toolbar = container.querySelector('[data-slot="all-work-toolbar-skeleton"]');

    expect(toolbar).toHaveClass("grid", "md:items-center");
    expect(toolbar?.children).toHaveLength(2);
    expect(toolbar?.lastElementChild).toHaveClass("flex", "overflow-hidden");
  });

  it("mirrors the default list as grouped content cards with headers and dense rows", () => {
    const { container } = render(<AllWorkSkeleton view="list" />);
    const groups = container.querySelectorAll('[data-slot="all-work-group-skeleton"]');

    expect(groups).toHaveLength(3);
    for (const group of groups) {
      const panel = group.firstElementChild;
      expect(panel?.firstElementChild).toHaveClass("border-b");
      expect(panel?.lastElementChild?.children).toHaveLength(4);
    }
  });

  it("reuses the table and kanban skeleton geometry for those views", () => {
    const table = render(<AllWorkSkeleton view="table" />);
    expect(table.container.querySelector("table")).toBeInTheDocument();
    table.unmount();

    const board = render(<AllWorkSkeleton view="board" />);
    expect(board.container.querySelectorAll(".w-72")).toHaveLength(4);
  });
});
