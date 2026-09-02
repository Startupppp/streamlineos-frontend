/**
 * The flat list path has always capped its render at LIST_RENDER_PAGE_SIZE.
 * The three grouped paths did not, so turning on `groupBy` silently mounted
 * every autoloaded ticket — up to BOARD_AUTOLOAD_LIMIT (500) rows — at once.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { GroupRows } from "./list-view-group-rows";
import { LIST_RENDER_PAGE_SIZE } from "./list-view-shared";
import type { Ticket } from "./list-view-shared";

jest.mock("./list-view-item", () => ({
  ListViewItem: ({ ticket }: { ticket: { id: number } }) => (
    <div data-testid="list-row">{ticket.id}</div>
  ),
}));

function makeTickets(count: number): Ticket[] {
  return Array.from(
    { length: count },
    (_, i) => ({ id: i + 1, title: `Ticket ${i + 1}` }) as unknown as Ticket,
  );
}

const noop = () => undefined;

function renderRows(count: number) {
  return render(<GroupRows items={makeTickets(count)} onTicketClick={noop} />);
}

describe("GroupRows", () => {
  it("renders a small group whole and offers nothing more", () => {
    renderRows(12);
    expect(screen.getAllByTestId("list-row")).toHaveLength(12);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("caps a large group at the same page size the flat path uses", () => {
    renderRows(500);
    expect(screen.getAllByTestId("list-row")).toHaveLength(LIST_RENDER_PAGE_SIZE);
  });

  it("says how much of the group is showing, and reveals the next page on demand", () => {
    renderRows(500);

    const more = screen.getByRole("button");
    expect(more).toHaveTextContent(`${LIST_RENDER_PAGE_SIZE} more`);
    expect(more).toHaveTextContent(`(${LIST_RENDER_PAGE_SIZE} of 500)`);

    fireEvent.click(more);

    expect(screen.getAllByTestId("list-row")).toHaveLength(LIST_RENDER_PAGE_SIZE * 2);
  });
});
