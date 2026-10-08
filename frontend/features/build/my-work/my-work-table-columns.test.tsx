import { render, screen } from "@testing-library/react";
import type { KanbanTicket } from "../shared/types";
import { MY_WORK_TABLE_COLUMNS } from "./my-work-table-columns";

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text, className }: { text: string; className?: string }) => (
    <span data-testid="work-item-title" data-class-name={className}>
      {text}
    </span>
  ),
}));

describe("MY_WORK_TABLE_COLUMNS", () => {
  it("renders the work item title through the truncation tooltip component", () => {
    const titleColumn = MY_WORK_TABLE_COLUMNS.find((column) => column.key === "title");
    const ticket = {
      id: 32,
      ticketNumber: 32,
      title: "A complete work item title that can exceed the available table width",
      project: { key: "STRE" },
    } as KanbanTicket;

    render(<>{titleColumn?.cell?.(ticket)}</>);

    expect(screen.getByTestId("work-item-title")).toHaveTextContent(ticket.title);
    expect(screen.getByTestId("work-item-title")).toHaveAttribute(
      "data-class-name",
      expect.stringContaining("min-w-0"),
    );
  });
});
