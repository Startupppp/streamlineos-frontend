
import { render, screen } from "@testing-library/react";
import { GroupRows } from "./list-view-group-rows";
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
  return render(
    <GroupRows
      items={makeTickets(count)}
      projectKey="ENG"
      projectId={1}
      projectStatuses={[]}
      displayOptions={undefined}
      onTicketClick={noop}
    />,
  );
}

describe("GroupRows", () => {
  it("renders a small group whole and offers nothing more", () => {
    renderRows(12);
    expect(screen.getAllByTestId("list-row")).toHaveLength(12);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a large group in full without a client-side cap", () => {
    renderRows(500);
    expect(screen.getAllByTestId("list-row")).toHaveLength(500);
  });

  it("shows no show-more button regardless of group size", () => {
    renderRows(500);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
