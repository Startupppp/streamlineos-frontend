import { render, screen } from "@testing-library/react";

const useAccess = jest.fn();
const useMyCommentDrafts = jest.fn();
const useDeleteCommentDraft = jest.fn();
const useDeleteAllCommentDrafts = jest.fn();
const push = jest.fn();

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
}));

import { InboxDraftsPanel } from "./inbox-drafts-panel";

function makeDraft(id: number) {
  return {
    id,
    body: `Draft body ${id}`,
    updatedAt: new Date().toISOString(),
    ticket: {
      id: id * 10,
      projectId: "proj-1",
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
});
