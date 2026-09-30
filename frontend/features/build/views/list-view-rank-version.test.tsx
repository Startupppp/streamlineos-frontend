/**
 * The backend's rankTicketSchema compare-and-swaps on `version` when the field is
 * supplied, but list-view.tsx never sent it — the protection was inert. This asserts
 * the rank mutation carries the real version off the dragged ticket's row, not a
 * hardcoded or coalesced stand-in, since a defaulted token would still satisfy a
 * looser "field is present" assertion while silently overwriting a concurrent edit.
 */
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ListView } from "./list-view";
import type { Ticket } from "./list-view-shared";
import type { DropResult } from "@hello-pangea/dnd";

let capturedOnDragEnd: ((result: DropResult) => void) | undefined;

jest.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children, onDragEnd }: { children: ReactNode; onDragEnd: (result: DropResult) => void }) => {
    capturedOnDragEnd = onDragEnd;
    return <>{children}</>;
  },
  Droppable: ({ children }: { children: (provided: unknown, snapshot: unknown) => ReactNode }) =>
    children({ droppableProps: {}, innerRef: jest.fn(), placeholder: null }, { isDraggingOver: false }),
  Draggable: ({ children }: { children: (provided: unknown, snapshot: unknown) => ReactNode }) =>
    children(
      { draggableProps: { style: {} }, dragHandleProps: {}, innerRef: jest.fn() },
      { isDragging: false },
    ),
}));

jest.mock("./list-view-item", () => ({
  ListViewItem: ({ ticket }: { ticket: { id: number } }) => (
    <div data-testid="list-row">{ticket.id}</div>
  ),
}));

jest.mock("./list-view-group-create", () => ({
  InlineGroupCreate: () => null,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const mockRankMutate = jest.fn();
const mockUpdateMutate = jest.fn();

jest.mock("@/hooks/api/build/tickets", () => ({
  useUpdateTicket: () => ({ mutate: mockUpdateMutate }),
  useRankTicket: () => ({ mutate: mockRankMutate }),
}));

function makeTicket(overrides: Partial<Ticket> & { id: number; version: number }): Ticket {
  return {
    title: `Ticket ${overrides.id}`,
    status: "OPEN",
    type: "TASK",
    rank: "a0",
    ...overrides,
  } as Ticket;
}

function renderListView(tickets: Ticket[]) {
  const client = createAppQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <ListView
      tickets={tickets}
      onTicketClick={jest.fn()}
      groupBy="status"
      rowBy="none"
      projectKey="ENG"
      projectId={1}
      projectStatuses={[]}
    />,
    { wrapper },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnDragEnd = undefined;
});

it("sends the dragged ticket's own version on a same-column reorder, not a hardcoded or coalesced stand-in", () => {
  const dragged = makeTicket({ id: 1, version: 7, rank: "a0" });
  const sibling = makeTicket({ id: 2, version: 9, rank: "a1" });
  renderListView([dragged, sibling]);

  expect(capturedOnDragEnd).toBeDefined();
  capturedOnDragEnd!({
    draggableId: "1",
    type: "LIST_TICKET",
    reason: "DROP",
    mode: "FLUID",
    source: { droppableId: "OPEN", index: 0 },
    destination: { droppableId: "OPEN", index: 1 },
    combine: null,
  } as DropResult);

  expect(mockRankMutate).toHaveBeenCalledTimes(1);
  expect(mockRankMutate).toHaveBeenCalledWith(
    expect.objectContaining({ ticketId: 1, version: 7 }),
  );
});
