import { act, fireEvent, render } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { ApiError } from "@/lib/api-client";
import PageCommentsSheet from "./page-comments-sheet";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbPageComments: jest.fn(() => ({
    data: [
      {
        id: 10,
        orgId: "org-1",
        pageId: 1,
        authorId: "user-author",
        authorName: "Alice",
        parentId: null,
        content: "This is a test comment",
        resolvedAt: null,
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      },
    ],
    isLoading: false,
  })),
  useCreateKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useResolveKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

const { useSession } = jest.requireMock<{ useSession: jest.Mock }>("next-auth/react");
const { useCan } = jest.requireMock<{ useCan: jest.Mock }>("@/hooks/api/access");
const { useKbPageComments, useCreateKbPageComment } = jest.requireMock<{
  useKbPageComments: jest.Mock;
  useCreateKbPageComment: jest.Mock;
}>("@/hooks/api/kb");

beforeEach(() => {
  jest.clearAllMocks();
  useKbPageComments.mockReturnValue({
    data: [{
      id: 10,
      orgId: "org-1",
      pageId: 1,
      authorId: "user-author",
      authorName: "Alice",
      parentId: null,
      content: "This is a test comment",
      resolvedAt: null,
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
    }],
    isLoading: false,
  });
});

describe("PageCommentsSheet — comment action visibility", () => {
  describe("non-author without kb:pages:update", () => {
    beforeEach(() => {
      useSession.mockReturnValue({ data: { user: { id: "user-other" } } });
      useCan.mockReturnValue(false);
    });

    it("does not show Edit button to a non-author without update permission", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      const editButtons = queryByRole("button", { name: /edit/i });
      expect(editButtons).toBeNull();
    });

    it("does not show Delete button to a non-author without update permission", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      const deleteButtons = queryByRole("button", { name: /delete/i });
      expect(deleteButtons).toBeNull();
    });

    it("does not show Resolve button without kb:pages:update", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      const resolveButtons = queryByRole("button", { name: /resolve/i });
      expect(resolveButtons).toBeNull();
    });

    it("hides Reply and the composer when update permission is denied", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(queryByRole("button", { name: /reply/i })).not.toBeInTheDocument();
      expect(queryByRole("textbox", { name: "Write a comment" })).not.toBeInTheDocument();
      expect(queryByRole("button", { name: "Post comment" })).not.toBeInTheDocument();
    });
  });

  describe("comment author without kb:pages:update", () => {
    beforeEach(() => {
      useSession.mockReturnValue({ data: { user: { id: "user-author" } } });
      useCan.mockReturnValue(false);
    });

    it("hides Edit from the author when the controller permission is denied", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    });

    it("hides Delete from the author when the controller permission is denied", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    });

    it("does not show Resolve to an author without kb:pages:update", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(queryByRole("button", { name: /resolve/i })).toBeNull();
    });

    it("describes the discussion and names the compose, reply and editing fields", async () => {
      useCan.mockImplementation((permission: string) => permission === "kb:pages:update");
      const view = render(<PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />);
      expect(view.getByRole("dialog")).toHaveAccessibleDescription("Discuss this page and resolve feedback with your team.");
      expect(view.getByRole("textbox", { name: "Write a comment" })).toBeInTheDocument();
      fireEvent.click(view.getByRole("button", { name: "Reply" }));
      expect(view.getByRole("textbox", { name: "Reply to comment" })).toBeInTheDocument();
      fireEvent.click(view.getByRole("button", { name: "Edit" }));
      expect(view.getByRole("textbox", { name: "Edit comment" })).toBeInTheDocument();
      await expectNoAxeViolations(view.baseElement);
    });

    it("shows a failed read with retry instead of claiming the page has no comments", () => {
      const refetch = jest.fn();
      useKbPageComments.mockReturnValueOnce({ data: [], isLoading: false, isError: true, error: new Error("Connection lost"), refetch });
      const view = render(<PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />);
      expect(view.queryByText("No comments yet")).not.toBeInTheDocument();
      expect(view.getByRole("alert")).toHaveTextContent("Connection lost");
      fireEvent.click(view.getByRole("button", { name: "Try again" }));
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("non-author with kb:pages:update (page editor)", () => {
    beforeEach(() => {
      useSession.mockReturnValue({ data: { user: { id: "user-editor" } } });
      useCan.mockImplementation((permission: string) => permission === "kb:pages:update");
    });

    it("hides Edit because editing another author's comment also requires manage permission", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    });

    it("hides Delete because deleting another author's comment also requires manage permission", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    });

    it("shows Resolve button via kb:pages:update", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /resolve/i })).toBeInTheDocument();
    });
  });

  it("allows a page manager to edit and delete another author's comment", () => {
    useSession.mockReturnValue({ data: { user: { id: "user-editor" } } });
    useCan.mockReturnValue(true);

    const view = render(<PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />);

    expect(view.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("does not show write actions when manage is granted without the controller's update permission", () => {
    useSession.mockReturnValue({ data: { user: { id: "user-editor" } } });
    useCan.mockImplementation((permission: string) => permission === "kb:pages:manage");

    const view = render(<PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />);

    expect(view.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(view.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(view.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
    expect(view.queryByRole("textbox", { name: "Write a comment" })).not.toBeInTheDocument();
  });
});

describe("PageCommentsSheet — WCAG 1.3.1 list semantics", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { id: "user-other" } } });
    useCan.mockReturnValue(false);
  });

  it("renders the active comment thread inside a list so screen readers report item count and boundaries", () => {
    const { getAllByRole } = render(
      <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
    );
    expect(getAllByRole("list").length).toBeGreaterThanOrEqual(1);
    expect(getAllByRole("listitem").length).toBeGreaterThanOrEqual(1);
  });
});

describe("PageCommentsSheet — bounded comments", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { id: "user-other" } } });
    useCan.mockReturnValue(false);
  });

  it("offers the next page while keeping already loaded comments visible", () => {
    const fetchNextPage = jest.fn();
    useKbPageComments.mockReturnValue({
      data: [{
        id: 10,
        orgId: "org-1",
        pageId: 1,
        authorId: "user-author",
        authorName: "Alice",
        parentId: null,
        content: "First page comment",
        resolvedAt: null,
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      }],
      isLoading: false,
      isError: false,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });

    const view = render(<PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />);
    expect(view.getByText("First page comment")).toBeInTheDocument();
    fireEvent.click(view.getByRole("button", { name: "Load more comments" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("keeps loaded comments and offers retry after a later page fails", () => {
    const fetchNextPage = jest.fn();
    const failure = new ApiError("Connection lost", 503, "UNAVAILABLE", { correlationId: "req-comments-next" }, "/kb/pages/1/comments");
    useKbPageComments.mockReturnValue({
      data: [{
        id: 10,
        orgId: "org-1",
        pageId: 1,
        authorId: "user-author",
        authorName: "Alice",
        parentId: null,
        content: "First page comment",
        resolvedAt: null,
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      }],
      isLoading: false,
      isError: true,
      isFetchNextPageError: true,
      error: failure,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });

    const view = render(<PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />);
    expect(view.getByText("First page comment")).toBeInTheDocument();
    expect(view.getByRole("alert")).toHaveTextContent("Connection lost");
    expect(view.getByText("req-comments-next")).toBeInTheDocument();
    fireEvent.click(view.getByRole("button", { name: "Retry loading comments" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("shows the request reference for a failed first read", () => {
    const failure = new ApiError("Unavailable", 503, "UNAVAILABLE", { correlationId: "req-comments-first" }, "/kb/pages/1/comments");
    useKbPageComments.mockReturnValue({ data: [], isLoading: false, isError: true, error: failure, refetch: jest.fn() });

    const view = render(<PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />);

    expect(view.getByRole("alert")).toHaveTextContent("Unavailable");
    expect(view.getByText("req-comments-first")).toBeInTheDocument();
  });

  it("reports a failed refresh while retaining comments and permits retry", () => {
    const refetch = jest.fn();
    const failure = new ApiError("Unavailable", 503, "UNAVAILABLE", { correlationId: "req-comments-refresh" }, "/kb/pages/1/comments");
    useKbPageComments.mockReturnValue({
      data: [{
        id: 10,
        orgId: "org-1",
        pageId: 1,
        authorId: "user-author",
        authorName: "Alice",
        parentId: null,
        content: "Cached comment",
        resolvedAt: null,
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      }],
      isLoading: false,
      isError: true,
      isFetchNextPageError: false,
      error: failure,
      refetch,
    });

    const view = render(<PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />);

    expect(view.getByText("Cached comment")).toBeInTheDocument();
    expect(view.getByRole("alert")).toHaveTextContent("Could not refresh comments");
    expect(view.getByText("req-comments-refresh")).toBeInTheDocument();
    fireEvent.click(view.getByRole("button", { name: "Retry loading comments" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("hides cached comments and write actions when access is revoked", () => {
    useCan.mockReturnValue(true);
    const failure = new ApiError("Access denied", 403, "FORBIDDEN", { correlationId: "req-comments-denied" }, "/kb/pages/1/comments");
    useKbPageComments.mockReturnValue({
      data: [{
        id: 10,
        orgId: "org-1",
        pageId: 1,
        authorId: "user-author",
        authorName: "Alice",
        parentId: null,
        content: "Formerly visible comment",
        resolvedAt: null,
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      }],
      isLoading: false,
      isError: true,
      error: failure,
      refetch: jest.fn(),
    });

    const view = render(<PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />);

    expect(view.queryByText("Formerly visible comment")).not.toBeInTheDocument();
    expect(view.queryByRole("textbox", { name: "Write a comment" })).not.toBeInTheDocument();
    expect(view.getByText("req-comments-denied")).toBeInTheDocument();
  });
});

describe("PageCommentsSheet — WCAG 4.1.3 status announcements", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { id: "user-other" } } });
    useCan.mockImplementation((permission: string) => permission === "kb:pages:update");
  });

  afterEach(() => {
    useCreateKbPageComment.mockImplementation(() => ({ mutate: jest.fn(), isPending: false }));
  });

  it("contains a polite live region so screen readers can receive status announcements", () => {
    const { getByRole } = render(
      <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
    );
    expect(getByRole("status")).toBeInTheDocument();
  });

  it("announces 'Comment posted.' in the live region after a successful top-level post", () => {
    let capturedOnSuccess: (() => void) | undefined;
    const mutateMock = jest.fn((_vars: unknown, opts: { onSuccess?: () => void }) => {
      capturedOnSuccess = opts.onSuccess;
    });
    useCreateKbPageComment.mockImplementation(() => ({
      mutate: mutateMock,
      isPending: false,
    }));

    const { getByRole } = render(
      <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
    );

    const textarea = getByRole("textbox", { name: "Write a comment" });
    fireEvent.change(textarea, { target: { value: "Hello world" } });
    fireEvent.click(getByRole("button", { name: /post comment/i }));

    expect(getByRole("status")).toHaveTextContent("");

    act(() => {
      capturedOnSuccess?.();
    });

    expect(getByRole("status")).toHaveTextContent("Comment posted.");
  });
});
