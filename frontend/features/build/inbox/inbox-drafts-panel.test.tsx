import { fireEvent, render, screen } from "@testing-library/react";
import type { CommentDraftListItem } from "@/hooks/api/build/comment-drafts";

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

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams("section=drafts");
  requestLeave.mockImplementation((action: () => void) => action());
  useAccess.mockReturnValue(accessGranted);
  useMyCommentDrafts.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
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

describe("InboxDraftsPanel — FE-112 bound", () => {
  it("renders at most 100 drafts even when more are returned", () => {
    const drafts = Array.from({ length: 150 }, (_, i) => makeDraft(i + 1));
    useMyCommentDrafts.mockReturnValue({
      data: drafts,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<InboxDraftsPanel />);
    const rows = screen.getAllByRole("button", { name: /delete draft/i });
    expect(rows.length).toBeLessThanOrEqual(100);
    expect(rows.length).toBe(100);
  });

  it("does not present the capped list size as the permanent deletion total", () => {
    useMyCommentDrafts.mockReturnValue({
      data: Array.from({ length: 150 }, (_, i) => makeDraft(i + 1)),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<InboxDraftsPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Clear all drafts" }));
    expect(screen.getByText("Permanently delete all your saved comment drafts. This cannot be undone.")).toBeInTheDocument();
    expect(screen.queryByText(/delete all (100|150) saved comment drafts/i)).not.toBeInTheDocument();
  });

  it("renders all drafts when fewer than 100 are returned", () => {
    const drafts = Array.from({ length: 5 }, (_, i) => makeDraft(i + 1));
    useMyCommentDrafts.mockReturnValue({
      data: drafts,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<InboxDraftsPanel />);
    const rows = screen.getAllByRole("button", { name: /delete draft/i });
    expect(rows.length).toBe(5);
  });
});

describe("InboxDraftsPanel — composition, not page duplication", () => {
  it("renders CommentDraftRow components from the drafts feature (not a copy)", () => {
    const drafts = [makeDraft(1)];
    useMyCommentDrafts.mockReturnValue({
      data: drafts,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<InboxDraftsPanel />);
    expect(screen.getByRole("button", { name: /delete draft/i })).toBeInTheDocument();
  });

  it("routes draft opening through the shared leave guard", async () => {
    const drafts = [makeDraft(1)];
    useMyCommentDrafts.mockReturnValue({
      data: drafts,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
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
    useMyCommentDrafts.mockReturnValue({
      data: [draft],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

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
    useMyCommentDrafts.mockReturnValue({
      data: [draft],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<InboxDraftsPanel />);
    expect(screen.getByRole("link", { name: "Open draft for #10 Ticket 1" })).toHaveAttribute(
      "href",
      "/build/1/tickets/1?returnTo=%2Fbuild%2Fmy-work%3Fsection%3Ddrafts",
    );
  });
});
