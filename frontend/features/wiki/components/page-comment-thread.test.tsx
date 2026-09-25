import React from "react";
import { render } from "@testing-library/react";
import { PageCommentThread } from "./page-comment-thread";
import type { KbPageComment } from "@/hooks/api/kb/page-comments";

jest.mock("@/hooks/api/kb", () => ({
  useUpdateKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useResolveKbPageComment: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

function comment(overrides: Partial<KbPageComment> = {}): KbPageComment {
  return {
    id: 1,
    orgId: "org-1",
    pageId: 1,
    authorId: "user-1",
    authorName: "Alice",
    parentId: null,
    content: "A top-level comment",
    anchorBlockIndex: null,
    anchorQuote: null,
    resolvedAt: null,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("PageCommentThread — WCAG 1.3.1 list semantics for replies", () => {
  it("renders the replies list as a native list so screen readers report item count and boundaries when replies are present", () => {
    const root = comment({ id: 10 });
    const replies: KbPageComment[] = [
      comment({ id: 20, parentId: 10, authorName: "Bob", content: "Reply one" }),
      comment({ id: 21, parentId: 10, authorName: "Carol", content: "Reply two" }),
    ];

    const { getAllByRole } = render(
      <PageCommentThread
        comment={root}
        replies={replies}
        pageId={1}
        onReply={jest.fn()}
        currentUserId="user-other"
        canUpdate={false}
      />,
    );

    const lists = getAllByRole("list");
    expect(lists).toHaveLength(1);
    const items = getAllByRole("listitem");
    expect(items).toHaveLength(replies.length);
  });
});
