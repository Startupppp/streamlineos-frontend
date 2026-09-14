import { act, fireEvent, render } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
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

    it("still shows Reply button (view-level action, available to all)", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /reply/i })).toBeInTheDocument();
    });
  });

  describe("comment author without kb:pages:update", () => {
    beforeEach(() => {
      useSession.mockReturnValue({ data: { user: { id: "user-author" } } });
      useCan.mockReturnValue(false);
    });

    it("shows Edit button to the comment author", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });

    it("shows Delete button to the comment author", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /delete/i })).toBeInTheDocument();
    });

    it("does not show Resolve to an author without kb:pages:update", () => {
      const { queryByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(queryByRole("button", { name: /resolve/i })).toBeNull();
    });

    it("describes the discussion and names the compose, reply and editing fields", async () => {
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
      useCan.mockReturnValue(true);
    });

    it("shows Edit button via update permission", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /edit/i })).toBeInTheDocument();
    });

    it("shows Delete button via update permission", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /delete/i })).toBeInTheDocument();
    });

    it("shows Resolve button via kb:pages:update", () => {
      const { getByRole } = render(
        <PageCommentsSheet pageId={1} open onOpenChange={jest.fn()} />,
      );
      expect(getByRole("button", { name: /resolve/i })).toBeInTheDocument();
    });
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

describe("PageCommentsSheet — WCAG 4.1.3 status announcements", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { id: "user-other" } } });
    useCan.mockReturnValue(false);
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
