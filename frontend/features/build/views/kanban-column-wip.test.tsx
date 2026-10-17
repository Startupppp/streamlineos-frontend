import { render, screen } from "@testing-library/react";
import { KanbanColumnWip } from "./kanban-column-wip";
import { resolveWipState } from "./kanban-board-utils";

describe("resolveWipState", () => {
  it("reports no limit when the status carries none, so a column without a WIP policy stays unstyled", () => {
    expect(resolveWipState(9, null)).toBe("none");
    expect(resolveWipState(9, undefined)).toBe("none");
  });

  it("treats a non-positive limit as no limit rather than a column that is permanently over", () => {
    expect(resolveWipState(0, 0)).toBe("none");
    expect(resolveWipState(3, -1)).toBe("none");
  });

  it("separates at-limit from over-limit, because the backend rejects the next drop only once the column is full", () => {
    expect(resolveWipState(4, 5)).toBe("under");
    expect(resolveWipState(5, 5)).toBe("at");
    expect(resolveWipState(6, 5)).toBe("over");
  });
});

describe("KanbanColumnWip", () => {
  it("renders a bare tabular count with no ratio when the column has no WIP limit", () => {
    render(<KanbanColumnWip count={12} />);

    const count = screen.getByLabelText("12 tickets");
    expect(count).toHaveTextContent("12");
    expect(count).toHaveAttribute("data-wip-state", "none");
    expect(count).toHaveClass("tabular-nums");
    expect(screen.queryByText("12/")).not.toBeInTheDocument();
  });

  it("shows count over limit in a neutral tone while the column is under its WIP limit", () => {
    render(<KanbanColumnWip count={3} wipLimit={5} />);

    const badge = screen.getByLabelText(
      "3 of 5 tickets, within the work-in-progress limit",
    );
    expect(badge).toHaveTextContent("3/5");
    expect(badge).toHaveAttribute("data-wip-state", "under");
    expect(badge).toHaveClass("bg-status-neutral-surface");
    expect(badge).toHaveClass("tabular-nums");
  });

  it("escalates to the warning tone at the limit, so the user sees the ceiling before a drop is refused", () => {
    render(<KanbanColumnWip count={5} wipLimit={5} />);

    const badge = screen.getByLabelText(
      "5 of 5 tickets, at the work-in-progress limit",
    );
    expect(badge).toHaveTextContent("5/5");
    expect(badge).toHaveAttribute("data-wip-state", "at");
    expect(badge).toHaveClass("bg-status-warning-surface");
    expect(badge).toHaveClass("text-status-warning-ink-strong");
  });

  it("escalates to the danger tone over the limit, which today only surfaces as an error toast", () => {
    render(<KanbanColumnWip count={8} wipLimit={5} />);

    const badge = screen.getByLabelText(
      "8 of 5 tickets, over the work-in-progress limit",
    );
    expect(badge).toHaveTextContent("8/5");
    expect(badge).toHaveAttribute("data-wip-state", "over");
    expect(badge).toHaveClass("bg-status-danger-surface");
    expect(badge).toHaveClass("text-status-danger-ink-strong");
  });

  it("carries the same wording in title as in the accessible name, so a hover explains the ratio too", () => {
    render(<KanbanColumnWip count={5} wipLimit={5} />);

    const badge = screen.getByLabelText(
      "5 of 5 tickets, at the work-in-progress limit",
    );
    expect(badge).toHaveAttribute(
      "title",
      "5 of 5 tickets, at the work-in-progress limit",
    );
  });

  it("names itself through role=img, because aria-label on a bare span is not reliably exposed", () => {
    const { rerender } = render(<KanbanColumnWip count={12} />);
    expect(screen.getByRole("img", { name: "12 tickets" })).toBeInTheDocument();

    rerender(<KanbanColumnWip count={5} wipLimit={5} />);
    expect(
      screen.getByRole("img", { name: "5 of 5 tickets, at the work-in-progress limit" }),
    ).toBeInTheDocument();
  });
});
