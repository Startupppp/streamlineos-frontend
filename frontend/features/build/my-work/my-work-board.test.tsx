import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import type { AllWorkTicket } from "@/types/projects";
import { MyWorkBoard } from "./my-work-board";
import { DEFAULT_DISPLAY_OPTIONS } from "../views/display-options-model";

function makeTicket(id: number): AllWorkTicket {
  return { id, title: `Ticket ${id}`, status: "TODO", type: "TASK", priority: "HIGH", projectId: 1, projectKey: "AL", projectName: "Alpha", ticketNumber: id, epicId: null, assigneeId: null, points: null, estimate: null, rank: null, version: 1, startDate: null, dueDate: null, cycleId: null, createdAt: null, updatedAt: null, assignee: null, labels: [] };
}

const mockNext = jest.fn();
const mockRefetch = jest.fn();
let mockPages = [{ data: [makeTicket(1)], nextCursor: "todo-next", hasMore: true, limit: 50, total: 500 }];
let mockFetching = false;
let mockLoading = false;
const mockQuery = jest.fn((filters: unknown) => {
  void filters;
  return { data: { pages: mockPages }, hasNextPage: true, isFetching: mockFetching, isFetchingNextPage: mockFetching, isLoading: mockLoading, isError: false, isFetchNextPageError: false, error: null, fetchNextPage: mockNext, refetch: mockRefetch };
});

jest.mock("@/hooks/api/build/all-work", () => ({ useInfiniteAllWork: (filters: unknown) => mockQuery(filters) }));
jest.mock("../views/kanban-ticket-card", () => ({ KanbanTicketCard: ({ ticket, readOnly }: { ticket: { title: string }; readOnly: boolean }) => <div data-read-only={readOnly}>{ticket.title}</div> }));
jest.mock("react-window", () => ({
  useDynamicRowHeight: () => 170,
  List: ({ rowCount, rowComponent: Row, rowProps }: { rowCount: number; rowComponent: ComponentType<Record<string, unknown>>; rowProps: object }) => (
    <div data-testid="virtual-list" data-row-count={rowCount}>
      <Row {...rowProps} index={0} style={{}} ariaAttributes={{}} />
      {rowCount > 1 ? <Row {...rowProps} index={rowCount - 1} style={{}} ariaAttributes={{}} /> : null}
    </div>
  ),
}));

function renderBoard(status = "TODO") {
  return render(<MyWorkBoard filters={{ scope: "mine", status, cursor: "global-list-cursor", search: "review", projectIds: "1", orderBy: "dueDate", orderDir: "asc" }} tickets={[]} displayOptions={DEFAULT_DISPLAY_OPTIONS} onTicketSelect={jest.fn()} />);
}

describe("My Work board cursor columns", () => {
  beforeEach(() => {
    mockQuery.mockClear(); mockNext.mockClear(); mockFetching = false; mockLoading = false;
    mockPages = [{ data: [makeTicket(1)], nextCursor: "todo-next", hasMore: true, limit: 50, total: 500 }];
  });

  it("uses an independent status cursor and retains URL filters instead of exposing a global pagination footer", () => {
    renderBoard("TODO,IN_REVIEW");
    expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({ scope: "mine", search: "review", projectIds: "1", status: "TODO", cursor: undefined, limit: 50, orderBy: "dueDate", orderDir: "asc" }));
    expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({ status: "IN_REVIEW", cursor: undefined }));
    expect(screen.queryByText(/Page \d/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next page/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("Ticket 1")[0]).toHaveAttribute("data-read-only", "true");
  });

  it("fetches the next cursor through the column sentinel", () => {
    renderBoard();
    fireEvent.click(screen.getByRole("button", { name: "Load next Todo tickets" }));
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("shows next-page loading and prevents a second fetch", () => {
    mockFetching = true;
    renderBoard();
    expect(screen.getByRole("status")).toHaveTextContent("Loading more");
    expect(screen.queryByRole("button", { name: /Load next/ })).not.toBeInTheDocument();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("bounds retained pages and gives an explicit filter-narrowing notice at the limit", () => {
    mockPages = Array.from({ length: 5 }, (_, index) => ({ data: Array.from({ length: 50 }, (_, row) => makeTicket(index * 50 + row + 1)), nextCursor: `cursor-${index}`, hasMore: true, limit: 50, total: 500 }));
    renderBoard();
    expect(screen.getByTestId("virtual-list")).toHaveAttribute("data-row-count", "251");
    expect(screen.getByRole("status")).toHaveTextContent("250 tickets loaded");
    expect(screen.queryByRole("button", { name: /Load next/ })).not.toBeInTheDocument();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("renders a column loading state before data arrives", () => {
    mockLoading = true;
    renderBoard();
    expect(screen.getByRole("status", { name: "Loading Todo tickets" })).toBeInTheDocument();
  });
});
