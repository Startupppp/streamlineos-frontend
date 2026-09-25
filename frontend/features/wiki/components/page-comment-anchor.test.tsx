import { fireEvent, render, screen } from "@testing-library/react";
import PageCommentsSheet from "./page-comments-sheet";
import { PageCommentThread } from "./page-comment-thread";
import { kbPageCommentContract } from "@/hooks/api/kb/kb-comments-schema";
import { extractCommentAnchorTargets } from "@/features/wiki/lib/page-comment-anchors";
import type { KbPageComment } from "@/hooks/api/kb/page-comments";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: { user: { id: "user-1" } } })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbPageComments: jest.fn(() => ({ data: [], isLoading: false })),
  useCreateKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useResolveKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

const { useCreateKbPageComment, useKbPageComments } = jest.requireMock<{
  useCreateKbPageComment: jest.Mock;
  useKbPageComments: jest.Mock;
}>("@/hooks/api/kb");

const PAGE_CONTENT = [
  { type: "h1", children: [{ text: "Refund policy" }] },
  { type: "p", children: [{ text: "Refunds are issued within 30 days." }] },
  { type: "p", children: [{ text: "" }] },
  { type: "p", children: [{ text: "Escalations go to the duty manager." }] },
];

function makeComment(overrides: Partial<KbPageComment> = {}): KbPageComment {
  return {
    id: 1,
    orgId: "org-1",
    pageId: 7,
    authorId: "user-1",
    authorName: "Alice",
    parentId: null,
    content: "Is this still true?",
    anchorBlockIndex: null,
    anchorQuote: null,
    resolvedAt: null,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useKbPageComments.mockReturnValue({ data: [], isLoading: false });
  useCreateKbPageComment.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe("kb page comment anchor contract", () => {
  it("keeps anchorBlockIndex and anchorQuote instead of stripping the backend's anchor fields", () => {
    const parsed = kbPageCommentContract.parse({
      id: 3,
      orgId: "org-1",
      pageId: 7,
      authorId: "user-1",
      parentId: null,
      content: "Is this still true?",
      anchorBlockIndex: 1,
      anchorQuote: "Refunds are issued within 30 days.",
      resolvedAt: null,
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
      authorName: "Alice",
    });

    expect(parsed.anchorBlockIndex).toBe(1);
    expect(parsed.anchorQuote).toBe("Refunds are issued within 30 days.");
  });
});

describe("extractCommentAnchorTargets", () => {
  it("numbers every anchorable block by its position in the page content and skips empty blocks", () => {
    expect(extractCommentAnchorTargets(PAGE_CONTENT)).toEqual([
      { blockIndex: 0, quote: "Refund policy" },
      { blockIndex: 1, quote: "Refunds are issued within 30 days." },
      { blockIndex: 3, quote: "Escalations go to the duty manager." },
    ]);
  });

  it("returns no targets for a page with no content", () => {
    expect(extractCommentAnchorTargets(null)).toEqual([]);
  });
});

describe("PageCommentsSheet — anchoring a comment to a block", () => {
  it("sends the chosen block index and its quote when a top-level comment is anchored", () => {
    const mutate = jest.fn();
    useCreateKbPageComment.mockReturnValue({ mutate, isPending: false });

    render(
      <PageCommentsSheet
        pageId={7}
        open
        onOpenChange={jest.fn()}
        content={PAGE_CONTENT}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Refunds are issued within 30 days." }),
    );
    fireEvent.change(screen.getByLabelText("Write a comment"), {
      target: { value: "Is this still true?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post comment" }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        pageId: 7,
        content: "Is this still true?",
        anchorBlockIndex: 1,
        anchorQuote: "Refunds are issued within 30 days.",
      }),
      expect.anything(),
    );
  });

  it("sends no anchor when the comment is left on the whole page", () => {
    const mutate = jest.fn();
    useCreateKbPageComment.mockReturnValue({ mutate, isPending: false });

    render(
      <PageCommentsSheet
        pageId={7}
        open
        onOpenChange={jest.fn()}
        content={PAGE_CONTENT}
      />,
    );

    fireEvent.change(screen.getByLabelText("Write a comment"), {
      target: { value: "General note" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post comment" }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ anchorBlockIndex: null, anchorQuote: null }),
      expect.anything(),
    );
  });

  it("offers no anchor control while replying, because the backend rejects an anchor on a reply", () => {
    useKbPageComments.mockReturnValue({
      data: [makeComment({ id: 10 })],
      isLoading: false,
    });

    render(
      <PageCommentsSheet
        pageId={7}
        open
        onOpenChange={jest.fn()}
        content={PAGE_CONTENT}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Anchor this comment to a block" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reply" }));

    expect(
      screen.queryByRole("group", { name: "Anchor this comment to a block" }),
    ).toBeNull();
  });
});

describe("PageCommentThread — anchored comment display", () => {
  it("shows the quoted block an anchored comment points at", () => {
    render(
      <PageCommentThread
        comment={makeComment({
          anchorBlockIndex: 1,
          anchorQuote: "Refunds are issued within 30 days.",
        })}
        replies={[]}
        pageId={7}
        onReply={jest.fn()}
        currentUserId="user-1"
        canUpdate
      />,
    );

    expect(
      screen.getByText("Refunds are issued within 30 days."),
    ).toBeInTheDocument();
  });

  it("shows no quote for a comment left on the whole page", () => {
    const { container } = render(
      <PageCommentThread
        comment={makeComment()}
        replies={[]}
        pageId={7}
        onReply={jest.fn()}
        currentUserId="user-1"
        canUpdate
      />,
    );

    expect(container.querySelector("blockquote")).toBeNull();
  });
});
