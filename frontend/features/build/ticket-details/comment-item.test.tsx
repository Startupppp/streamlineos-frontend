import { render, screen } from "@testing-library/react";
import type { TicketComment } from "@/types/projects";
import { CommentItem } from "./comment-item";

jest.mock("next/dynamic", () => () => () => null);
jest.mock("@/components/editor/rich-text-content", () => ({
  RichTextContent: () => <div>Looks good</div>,
}));

const COMMENT: TicketComment = {
  id: 501,
  orgId: "org-1",
  ticketId: 7,
  userId: "author-1",
  content: "Looks good",
  parentCommentId: null,
  createdAt: "2026-09-15T11:00:00.000Z",
  updatedAt: "2026-09-15T11:00:00.000Z",
  user: {
    id: "author-1",
    name: "Asha Rao",
    firstName: "Asha",
    lastName: "Rao",
    email: "asha@example.com",
    image: null,
  },
};

const noop = () => {};

function renderItem(currentUserId: string) {
  return render(
    <CommentItem
      comment={COMMENT}
      currentUserId={currentUserId}
      members={[]}
      isReplying={false}
      onReply={noop}
      onCancelReply={noop}
      replyText=""
      onReplyTextChange={noop}
      onReplySubmit={noop}
      onReplyKeyDown={noop}
      isReplyPending={false}
      onReact={noop}
      onUnreact={noop}
      canInteract
      onSaveEdit={noop}
      onDelete={noop}
      isSavingEdit={false}
      isDeletingComment={false}
    />,
  );
}

describe("CommentItem — destructive actions", () => {
  it("shows Delete only to the person who wrote the comment", () => {
    renderItem("author-1");

    expect(screen.getByRole("button", { name: "Delete comment" })).toBeInTheDocument();
  });

  it("hides Delete from a teammate who did not write the comment", () => {
    renderItem("viewer-2");

    expect(screen.queryByRole("button", { name: "Delete comment" })).toBeNull();
  });
});
