import { act, fireEvent, render, screen } from "@testing-library/react";
import type { CommentDraftListItem } from "@/hooks/api/build/comment-draft-command-cache";

const useAccess = jest.fn();
const useMyCommentDrafts = jest.fn();
const useDeleteCommentDraft = jest.fn();
const useDeleteAllCommentDrafts = jest.fn();
const push = jest.fn();
const requestLeave = jest.fn((action: () => void) => action());
let mockSearchParams = new URLSearchParams();

const accessLoading = { data: undefined, isLoading: true };
const accessGranted = {
  data: { isOrgOwner: false, scopes: { "build:tickets:view": "all" }, modules: {} },
  isLoading: false,
};
const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

let observerCallback: IntersectionObserverCallback | null = null;
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

beforeAll(() => {
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: class {
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }
      observe = mockObserve;
      unobserve = jest.fn();
      disconnect = mockDisconnect;
    },
  });
});

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => useAccess(),
}));
jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/build/comment-drafts", () => ({
  useMyCommentDrafts: () => useMyCommentDrafts(),
  useDeleteCommentDraft: () => useDeleteCommentDraft(),
  useDeleteAllCommentDrafts: () => useDeleteAllCommentDrafts(),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => mockSearchParams,
}));
jest.mock("@/components/shared/dirty-state-context", () => ({
  useNavigationLeave: () => requestLeave,
}));

import { InboxDraftsPanel } from "./inbox-drafts-panel";

function makeDraft(id: number): CommentDraftListItem {
  return {
    id,
    ticketId: id * 10,
    orgId: "test-org",
    membershipId: null,
    body: `Draft body ${id}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ticket: {
      id: id * 10,
      projectId: 1,
      projectKey: "BLD",
      projectName: "Build",
      ticketNumber: id,
      title: `Ticket ${id}`,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      type: "TASK",
      assignee: null,
    },
  };
}

function makeInfiniteResult(
  items: CommentDraftListItem[],
  hasMore = false,
  nextCursor: string | null = null,
) {
  return {
    data: {
      pages: [{ data: items, pagination: { limit: 25, hasMore, nextCursor } }],
      pageParams: [null],
    },
    fetchNextPage: jest.fn(),
    hasNextPage: hasMore,
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  observerCallback = null;
  mockSearchParams = new URLSearchParams("section=drafts");
  requestLeave.mockImplementation((action: () => void) => action());
  useAccess.mockReturnValue(accessGranted);
  useMyCommentDrafts.mockReturnValue(makeInfiniteResult([]));
  useDeleteCommentDraft.mockReturnValue({ mutate: jest.fn() });
  useDeleteAllCommentDrafts.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe("InboxDraftsPanel — denied renders NoPermissionState, not empty", () => {
  it("shows Access Restricted when build:tickets:view is denied, not the empty drafts message", () => {
    useAccess.mockReturnValue(accessDenied);
    render(<InboxDraftsPanel />);
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText("No drafts saved")).not.toBeInTheDocument();
  });

  it("shows the drafts empty state when access is granted and there are no drafts", () => {
    render(<InboxDraftsPanel />);
    expect(screen.getByText("No drafts saved")).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).toBeNull();
  });
});

describe("InboxDraftsPanel — loading state", () => {
  it("does not show Access Restricted while access is still loading", () => {
    useAccess.mockReturnValue(accessLoading);
    render(<InboxDraftsPanel />);
    expect(screen.queryByText("Access Restricted")).toBeNull();
  });

  it("does not show the drafts empty state while access is loading", () => {
    useAccess.mockReturnValue(accessLoading);
    render(<InboxDraftsPanel />);
    expect(screen.queryByText("No drafts saved")).toBeNull();
  });
});

describe("InboxDraftsPanel — FE-112 / FE-125 infinite scroll", () => {
  it("renders all items from the current loaded pages", () => {
    const drafts = Array.from({ length: 5 }, (_, i) => makeDraft(i + 1));
    useMyCommentDrafts.mockReturnValue(makeInfiniteResult(drafts));
    render(<InboxDraftsPanel />);
    const rows = screen.getAllByRole("button", { name: /delete draft/i });
    expect(rows.length).toBe(5);
  });

  it("renders items from multiple loaded pages by flattening them", () => {
    const page1 = Array.from({ length: 3 }, (_, i) => makeDraft(i + 1));
    const page2 = Array.from({ length: 2 }, (_, i) => makeDraft(i + 4));
    useMyCommentDrafts.mockReturnValue({
      data: {
        pages: [
          { data: page1, pagination: { limit: 25, hasMore: true, nextCursor: "c1" } },
          { data: page2, pagination: { limit: 25, hasMore: false, nextCursor: null } },
        ],
        pageParams: [null, "c1"],
      },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<InboxDraftsPanel />);
    const rows = screen.getAllByRole("button", { name: /delete draft/i });
    expect(rows.length).toBe(5);
  });

  it("does not present a count in the permanent deletion dialog", () => {
    useMyCommentDrafts.mockReturnValue(
      makeInfiniteResult(Array.from({ length: 25 }, (_, i) => makeDraft(i + 1))),
    );
    render(<InboxDraftsPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Clear all drafts" }));
    expect(
      screen.getByText("Permanently delete all your saved comment drafts. This cannot be undone."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/delete all \d+ saved comment drafts/i)).not.toBeInTheDocument();
  });

  it("shows a sentinel element at the bottom of the list when hasNextPage is true", () => {
    const drafts = [makeDraft(1)];
    useMyCommentDrafts.mockReturnValue(makeInfiniteResult(drafts, true, "cursor-1"));
    const { container } = render(<InboxDraftsPanel />);
    const sentinel = container.querySelector('[aria-hidden="true"]');
    expect(sentinel).toBeInTheDocument();
    expect(mockObserve).toHaveBeenCalled();
  });

  it("calls fetchNextPage when the sentinel becomes visible and hasNextPage is true", () => {
    const fetchNextPage = jest.fn();
    useMyCommentDrafts.mockReturnValue({
      ...makeInfiniteResult([makeDraft(1)], true, "cursor-1"),
      fetchNextPage,
    });
    render(<InboxDraftsPanel />);

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("does not register an IntersectionObserver when hasNextPage is false", () => {
    mockObserve.mockClear();
    useMyCommentDrafts.mockReturnValue(makeInfiniteResult([makeDraft(1)], false));
    render(<InboxDraftsPanel />);
    expect(mockObserve).not.toHaveBeenCalled();
  });
});

describe("InboxDraftsPanel — composition, not page duplication", () => {
  it("renders CommentDraftRow components from the drafts feature (not a copy)", () => {
    useMyCommentDrafts.mockReturnValue(makeInfiniteResult([makeDraft(1)]));
    render(<InboxDraftsPanel />);
    expect(screen.getByRole("button", { name: /delete draft/i })).toBeInTheDocument();
  });

  it("routes draft opening through the shared leave guard", async () => {
    useMyCommentDrafts.mockReturnValue(makeInfiniteResult([makeDraft(1)]));
    let pendingNavigation: (() => void) | undefined;
    requestLeave.mockImplementation((action: () => void) => {
      pendingNavigation = action;
    });

    render(<InboxDraftsPanel />);
    fireEvent.click(screen.getByRole("link", { name: "Open draft for BLD-1 Ticket 1" }));

    expect(requestLeave).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    pendingNavigation?.();
    expect(push).toHaveBeenCalledWith(
      "/build/1/tickets/BLD-1?returnTo=%2Fbuild%2Fmy-work%3Fsection%3Ddrafts",
    );
  });

  it("keeps a missing-project draft deletable without offering a broken ticket link", () => {
    const draft = makeDraft(1);
    draft.ticket.projectId = null;
    const deleteMutate = jest.fn();
    useDeleteCommentDraft.mockReturnValue({ mutate: deleteMutate });
    useMyCommentDrafts.mockReturnValue(makeInfiniteResult([draft]));

    render(<InboxDraftsPanel />);
    expect(screen.queryByRole("link", { name: /open draft/i })).not.toBeInTheDocument();
    expect(screen.getByText("Ticket unavailable. You can still delete this draft.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete draft for BLD-1" }));
    expect(deleteMutate).toHaveBeenCalledWith(1, expect.objectContaining({ onError: expect.any(Function) }));
    expect(push).not.toHaveBeenCalled();
  });

  it("links a draft with no project key through the numeric ticket detail route", () => {
    const draft = makeDraft(1);
    draft.ticket.projectKey = null;
    useMyCommentDrafts.mockReturnValue(makeInfiniteResult([draft]));

    render(<InboxDraftsPanel />);
    expect(screen.getByRole("link", { name: "Open draft for #10 Ticket 1" })).toHaveAttribute(
      "href",
      "/build/1/tickets/1?returnTo=%2Fbuild%2Fmy-work%3Fsection%3Ddrafts",
    );
  });
});
