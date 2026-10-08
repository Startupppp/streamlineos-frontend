import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MyWorkContent } from "./my-work-content";
import { DEFAULT_DISPLAY_OPTIONS } from "../views/display-options-model";
import type { KanbanTicket } from "../shared/types";

const mockNavigate = jest.fn();
const mockTicket: KanbanTicket = { id: 35, version: 4, title: "Review", status: "TODO", type: "TASK", ticketNumber: 35, project: { id: 1, key: "STRE", name: "Streamline" } };

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }), useSearchParams: () => new URLSearchParams() }));
jest.mock("@/components/shared/dirty-state-context", () => ({ useNavigationLeave: () => jest.fn() }));
jest.mock("@/hooks/common/use-online-status", () => ({ useOnlineStatus: () => true }));
jest.mock("@/hooks/common/use-guarded-document-navigation", () => ({ useGuardedDocumentNavigation: () => mockNavigate }));
jest.mock("./my-work-view-body-lazy", () => ({ MyWorkViewBody: () => <div>Ticket view</div> }));
jest.mock("@/components/ui/data-table", () => ({ DataTable: ({ onRowClick }: { onRowClick: (ticket: KanbanTicket) => void }) => {
  function handleOpen() { onRowClick(mockTicket); }
  return <button type="button" onClick={handleOpen}>Open table ticket</button>;
} }));

const props: ComponentProps<typeof MyWorkContent> = {
  pageState: { kind: "ready" }, view: "board", grouping: "none", showBucketList: false,
  activeData: { data: [], limit: 50, nextCursor: "next-global-page", hasMore: true, total: 300 },
  kanbanTickets: [], ticketMeta: new Map(), dueBuckets: null, displayOptions: DEFAULT_DISPLAY_OPTIONS,
  emptyTitle: "No tickets", emptyDescription: "No work", filtersActive: false,
  sortField: "rank", sortDirection: "asc", pageNumber: 1, hasPrevious: false,
  onRetry: jest.fn(), onClearFilters: jest.fn(), onSortChange: jest.fn(), onNextPage: jest.fn(), onPreviousPage: jest.fn(),
  orgStatuses: undefined, boardFilters: { scope: "mine" },
  bulk: { tableSelection: new Set(), setTableSelection: jest.fn(), selectedCount: 0, isPendingBulk: false, handleBulkStatus: jest.fn(), handleBulkPriority: jest.fn(), handleBulkAssignee: jest.fn(), handleBulkCycleNoOp: jest.fn(), handleClearSelection: jest.fn() },
};

describe("My Work pagination placement", () => {
  it("opens DataTable rows through guarded document navigation", () => {
    render(<MyWorkContent {...props} view="table" kanbanTickets={[mockTicket]} ticketMeta={new Map([[35, { id: 35, projectId: 1, projectKey: "STRE", ticketNumber: 35 }]])} />);
    fireEvent.click(screen.getByRole("button", { name: "Open table ticket" }));
    expect(mockNavigate).toHaveBeenCalledWith("/build/1/tickets/STRE-35?returnTo=%2Fbuild%2Fmy-work");
  });
  it("omits global cursor controls from board view even when the list has a next page", () => {
    render(<MyWorkContent {...props} />);
    expect(screen.getByText("Ticket view")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Page 1/)).not.toBeInTheDocument();
  });

  it("retains cursor controls for the list view", () => {
    render(<MyWorkContent {...props} view="list" />);
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });
});
