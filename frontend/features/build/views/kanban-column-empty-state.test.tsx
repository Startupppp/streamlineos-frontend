import { render, screen } from "@testing-library/react";
import { ColumnEmptyState } from "./kanban-board-column";
import type { KanbanColumn } from "../shared/types";

function makeColumn(id: string, name: string): KanbanColumn {
  return { id, name, color: null, order: 0 };
}

describe("ColumnEmptyState", () => {
  it("names what belongs in an in-progress column rather than repeating a generic 'No tickets'", () => {
    render(<ColumnEmptyState column={makeColumn("IN_PROGRESS", "In Progress")} compact={false} />);

    expect(screen.getByText("Nothing in progress")).toBeInTheDocument();
    expect(screen.getByText("Drop a ticket here when work begins.")).toBeInTheDocument();
  });

  it("names what belongs in a completion column, matched on the status name a tenant chose", () => {
    render(<ColumnEmptyState column={makeColumn("SHIPPED", "Complete")} compact={false} />);

    expect(screen.getByText("Nothing done yet")).toBeInTheDocument();
    expect(screen.getByText("Drop a ticket here when it ships.")).toBeInTheDocument();
  });

  it("falls back to generic copy for a status whose name says nothing about its stage", () => {
    render(<ColumnEmptyState column={makeColumn("TRIAGE", "Triage")} compact={false} />);

    expect(screen.getByText("No tickets")).toBeInTheDocument();
    expect(screen.getByText("Drop a ticket here to get started.")).toBeInTheDocument();
  });

  it("keeps the icon at the compact empty-state size and weight so it never outranks the cards beside it", () => {
    render(<ColumnEmptyState column={makeColumn("TODO", "To Do")} compact={false} />);

    const icon = screen.getByTestId("column-empty-icon");
    expect(icon).toHaveClass("h-8", "w-8", "text-muted-foreground", "opacity-40");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("drops the hint in a swimlane row, where the column body is too short to carry two lines", () => {
    render(<ColumnEmptyState column={makeColumn("TODO", "To Do")} compact />);

    expect(screen.getByText("No tickets")).toBeInTheDocument();
    expect(screen.queryByText("Drop a ticket here to get started.")).not.toBeInTheDocument();
  });

  it("hardcodes no height, so the empty column fills its body through the flex chain", () => {
    const { container } = render(
      <ColumnEmptyState column={makeColumn("TODO", "To Do")} compact={false} />,
    );

    const root = container.firstElementChild;
    expect(root?.className).not.toMatch(/\b(h-\d|min-h-\[)/);
  });
});
