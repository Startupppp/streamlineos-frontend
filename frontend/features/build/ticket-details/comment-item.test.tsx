import { render, screen, fireEvent } from "@testing-library/react";
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

function renderItem(currentUserId: string, onSaveEdit: (id: number, content: string) => void = noop) {
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
      onSaveEdit={onSaveEdit}
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

describe("CommentItem — edit mode", () => {
  it("does not call onSaveEdit when Escape is pressed", () => {
    const onSaveEdit = jest.fn();
    renderItem("author-1", onSaveEdit);

    fireEvent.click(screen.getByRole("button", { name: "Edit comment" }));

    const editField = screen.getByTestId("comment-edit-field");
    fireEvent.keyDown(editField, { key: "Escape", bubbles: true });

    expect(onSaveEdit).not.toHaveBeenCalled();
    expect(screen.queryByTestId("comment-edit-field")).toBeNull();
  });

  it("closes edit mode on Ctrl+Enter without calling onSaveEdit when content is unchanged", () => {
    const onSaveEdit = jest.fn();
    renderItem("author-1", onSaveEdit);

    fireEvent.click(screen.getByRole("button", { name: "Edit comment" }));

    const editField = screen.getByTestId("comment-edit-field");
    fireEvent.keyDown(editField, { key: "Enter", ctrlKey: true, bubbles: true });

    expect(onSaveEdit).not.toHaveBeenCalled();
    expect(screen.queryByTestId("comment-edit-field")).toBeNull();
  });
});
