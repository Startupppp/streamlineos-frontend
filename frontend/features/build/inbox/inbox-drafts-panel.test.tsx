import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CommentDraftListItem } from "@/hooks/api/build/comment-draft-command-cache";

const useAccess = jest.fn();
const useMyCommentDrafts = jest.fn();
const useDeleteCommentDraft = jest.fn();
const push = jest.fn();
const replace = jest.fn();
const requestLeave = jest.fn((action: () => void) => action());
const deleteMutate = jest.fn();
const assign = jest.fn();
const realLocation = window.location;
let mockSearchParams = new URLSearchParams();
let mockCanDelete = true;

const accessLoading = { data: undefined, isLoading: true };
const accessGranted = { data: { isOrgOwner: false, scopes: { "build:tickets:view": "all" }, modules: {} }, isLoading: false };
const accessDenied = { data: { isOrgOwner: false, scopes: {}, modules: {} }, isLoading: false };

jest.mock("@/hooks/api/access", () => ({ useAccess: () => useAccess(), useCan: () => mockCanDelete }));
jest.mock("@/hooks/api/entitlements", () => ({ useEntitlements: () => ({ data: undefined }) }));
jest.mock("@/hooks/api/build/comment-drafts", () => ({
  useMyCommentDrafts: (cursor?: string) => useMyCommentDrafts(cursor),
  useDeleteCommentDraft: () => useDeleteCommentDraft(),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }), usePathname: () => "/build/my-work", useSearchParams: () => mockSearchParams }));
jest.mock("@/components/shared/dirty-state-context", () => ({ useNavigationLeave: () => requestLeave }));

import { InboxDraftsPanel } from "./inbox-drafts-panel";

beforeAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...realLocation, assign },
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: realLocation,
  });
});

function makeDraft(id: number): CommentDraftListItem {
  return {
    id, ticketId: id * 10, orgId: "test-org", membershipId: null, body: `Draft body ${id}`,
    createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-01T10:00:00.000Z",
    ticket: { id: id * 10, projectId: 1, projectKey: "BLD", projectName: "Build", ticketNumber: id, title: `Ticket ${id}`, status: "IN_PROGRESS", priority: "MEDIUM", type: "TASK", assignee: null },
  };
}

function makeResult(items: CommentDraftListItem[], hasMore = false, nextCursor: string | null = null) {
  return {
    data: { pages: [{ data: items, pagination: { limit: 25, hasMore, nextCursor } }], pageParams: [null] },
    fetchNextPage: jest.fn(), hasNextPage: hasMore, isFetchingNextPage: false, isFetching: false,
    isLoading: false, isError: false, error: null, refetch: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams("section=drafts");
  mockCanDelete = true;
  requestLeave.mockImplementation((action: () => void) => action());
  useAccess.mockReturnValue(accessGranted);
  useMyCommentDrafts.mockReturnValue(makeResult([]));
  deleteMutate.mockReset().mockResolvedValue({ deleted: true });
  useDeleteCommentDraft.mockReturnValue({ mutateAsync: deleteMutate, isPending: false });
});

describe("draft access and loading", () => {
  it("shows Access Restricted when permission is denied, not an empty state", () => {
    useAccess.mockReturnValue(accessDenied);
    render(<InboxDraftsPanel />);
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText("No drafts saved")).not.toBeInTheDocument();
  });
  it("shows the empty state when access is granted", () => {
    render(<InboxDraftsPanel />);
    expect(screen.getByText("No drafts saved")).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).toBeNull();
  });
  it("does not show denial while access loads", () => {
    useAccess.mockReturnValue(accessLoading);
    render(<InboxDraftsPanel />);
    expect(screen.queryByText("Access Restricted")).toBeNull();
  });
  it("does not show emptiness while access loads", () => {
    useAccess.mockReturnValue(accessLoading);
    render(<InboxDraftsPanel />);
    expect(screen.queryByText("No drafts saved")).toBeNull();
  });
});

describe("bounded cursor pagination", () => {
  it("renders the current server page", () => {
    useMyCommentDrafts.mockReturnValue(makeResult(Array.from({ length: 5 }, (_, i) => makeDraft(i + 1))));
    render(<InboxDraftsPanel />);
    expect(screen.getAllByRole("link", { name: /Open draft/ })).toHaveLength(5);
  });
  it("does not flatten historical pages into an unbounded DOM", () => {
    const result = makeResult([makeDraft(1)]);
    result.data.pages.push({ data: [makeDraft(2)], pagination: { limit: 25, hasMore: false, nextCursor: null } });
    useMyCommentDrafts.mockReturnValue(result);
    render(<InboxDraftsPanel />);
    expect(screen.getAllByRole("link", { name: /Open draft/ })).toHaveLength(1);
    expect(screen.queryByText("Ticket 2")).not.toBeInTheDocument();
  });
  it("confirms deletion of the selected count rather than all drafts", () => {
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1), makeDraft(2), makeDraft(3)]));
    render(<InboxDraftsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Enter selection" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select draft for BLD-1" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select draft for BLD-2" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected drafts (2)" }));
    expect(screen.getByText("Permanently delete these 2 saved comment drafts. This cannot be undone.")).toBeInTheDocument();
    expect(deleteMutate).not.toHaveBeenCalled();
  });
  it("shows next/previous controls without inventing a total", () => {
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1)], true, "cursor-1"));
    render(<InboxDraftsPanel />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(screen.queryByText(/of \d+/)).not.toBeInTheDocument();
  });
  it("writes the next cursor into the URL and preserves ticket filters", () => {
    mockSearchParams = new URLSearchParams("section=drafts&q=api&cursors=%5B%22ticket-cursor%22%5D");
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1)], true, "draft-next"));
    render(<InboxDraftsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    const params = new URLSearchParams(String(replace.mock.calls[0][0]).split("?")[1]);
    expect(params.get("draftCursors")).toBe('["draft-next"]');
    expect(params.get("cursors")).toBe('["ticket-cursor"]');
    expect(params.get("q")).toBe("api");
  });
  it("disables next when the server reports exhaustion", () => {
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1)]));
    render(<InboxDraftsPanel />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
  it("reloads the URL cursor, resets selection on page change, and can return to an empty prior page", () => {
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1), makeDraft(2)]));
    const view = render(<InboxDraftsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Enter selection" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select drafts on this page" }));
    expect(screen.getByRole("button", { name: "Delete selected drafts (2)" })).toBeInTheDocument();
    mockSearchParams = new URLSearchParams({ section: "drafts", draftCursors: '["next"]' });
    useMyCommentDrafts.mockReturnValue(makeResult([]));
    view.rerender(<InboxDraftsPanel />);
    expect(useMyCommentDrafts).toHaveBeenLastCalledWith("next");
    expect(screen.queryByRole("button", { name: /Delete selected/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(replace).toHaveBeenCalledWith("/build/my-work?section=drafts", { scroll: false });
  });
});

describe("draft composition, selection and navigation", () => {
  it("shows only a compact selection entry control by default with no inner heading", () => {
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1), makeDraft(2)]));
    render(<InboxDraftsPanel />);
    expect(screen.queryByText("Comment drafts")).not.toBeInTheDocument();
    expect(screen.queryByText("Resume a saved comment where you left off.")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter selection" }));
    expect(screen.getByRole("checkbox", { name: "Select drafts on this page" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select drafts on this page" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete selected drafts/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter selection" }));
    expect(screen.getByRole("checkbox", { name: "Select drafts on this page" })).not.toBeChecked();
  });
  it("shows bulk delete only after multiple drafts are selected", () => {
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1), makeDraft(2)]));
    render(<InboxDraftsPanel />);
    expect(screen.queryByRole("button", { name: "Clear all drafts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete selected drafts/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter selection" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select draft for BLD-1" }));
    expect(screen.queryByRole("button", { name: /Delete selected drafts/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select draft for BLD-2" }));
    expect(screen.getByRole("button", { name: "Delete selected drafts (2)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.queryByRole("button", { name: /Delete selected drafts/ })).not.toBeInTheDocument();
  });
  it("opens the numeric ticket route with explicit saved-draft intent", () => {
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1)]));
    render(<InboxDraftsPanel />);
    expect(screen.getByRole("link", { name: "Open draft for BLD-1 Ticket 1" })).toHaveAttribute("href", "/build/1/tickets/1?returnTo=%2Fbuild%2Fmy-work%3Fsection%3Ddrafts&draft=resume");
  });
  it("reuses draft rows with selectable identities", () => {
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1)]));
    render(<InboxDraftsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Enter selection" }));
    expect(screen.getByRole("checkbox", { name: "Select draft for BLD-1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete draft for BLD-1" })).not.toBeInTheDocument();
  });
  it("routes draft opening through the leave guard", () => {
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1)]));
    let pendingNavigation: (() => void) | undefined;
    requestLeave.mockImplementation((action: () => void) => { pendingNavigation = action; });
    render(<InboxDraftsPanel />);
    fireEvent.click(screen.getByRole("link", { name: "Open draft for BLD-1 Ticket 1" }));
    expect(requestLeave).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
    pendingNavigation?.();
    expect(assign).toHaveBeenCalledWith("/build/1/tickets/1?returnTo=%2Fbuild%2Fmy-work%3Fsection%3Ddrafts&draft=resume");
  });
  it("keeps unavailable drafts safely deletable after confirmation", async () => {
    const draft = makeDraft(1);
    draft.ticket.projectId = null;
    useMyCommentDrafts.mockReturnValue(makeResult([draft]));
    render(<InboxDraftsPanel />);
    expect(screen.queryByRole("link", { name: /Open draft/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete draft for BLD-1" }));
    expect(deleteMutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith(1));
    expect(push).not.toHaveBeenCalled();
  });
  it("uses the numeric ticket number even with no project key", () => {
    const draft = makeDraft(1);
    draft.ticket.projectKey = null;
    useMyCommentDrafts.mockReturnValue(makeResult([draft]));
    render(<InboxDraftsPanel />);
    expect(screen.getByRole("link", { name: "Open draft for #10 Ticket 1" })).toHaveAttribute("href", "/build/1/tickets/1?returnTo=%2Fbuild%2Fmy-work%3Fsection%3Ddrafts&draft=resume");
  });
  it("deletes only selected drafts, leaving unselected drafts untouched", async () => {
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1), makeDraft(2), makeDraft(3)]));
    render(<InboxDraftsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Enter selection" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select draft for BLD-1" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select draft for BLD-2" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected drafts (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteMutate).toHaveBeenCalledTimes(2));
    expect(deleteMutate.mock.calls).toEqual([[1], [2]]);
  });
  it("hides mutation controls without the exact endpoint permission", () => {
    mockCanDelete = false;
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1), makeDraft(2)]));
    render(<InboxDraftsPanel />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open draft/ })).toHaveLength(2);
  });
  it("preserves the draft cursor in the ticket return URL", () => {
    mockSearchParams = new URLSearchParams({ section: "drafts", draftCursors: '["resume-cursor"]' });
    useMyCommentDrafts.mockReturnValue(makeResult([makeDraft(1)]));
    render(<InboxDraftsPanel />);
    const href = screen.getByRole("link", { name: /Open draft/ }).getAttribute("href");
    const destination = new URL(href ?? "", "https://streamline.invalid");
    const back = new URL(destination.searchParams.get("returnTo") ?? "", "https://streamline.invalid");
    expect(back.searchParams.get("draftCursors")).toBe('["resume-cursor"]');
  });
});
