import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { TicketComment } from "@/types/projects";
import { CommentItem } from "./comment-item";

jest.mock("next/dynamic", () => (_loader: unknown) => {
  function MockTiptap({ onChangeHtml }: { onChangeHtml?: (html: string) => void }) {
    React.useEffect(() => {
      onChangeHtml?.("<p>Looks good</p>");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
  }
  return MockTiptap;
});

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

function renderItem(onSaveEdit: (id: number, content: string) => void = noop) {
  return render(
    <CommentItem
      comment={COMMENT}
      currentUserId="author-1"
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

describe("CommentItem — edit round-trip", () => {
  it("does not call onSaveEdit when the editor HTML-normalises plain-text content on init and user saves without typing", async () => {
    const onSaveEdit = jest.fn();
    renderItem(onSaveEdit);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Edit comment" }));
    });

    const editField = screen.getByTestId("comment-edit-field");
    fireEvent.keyDown(editField, { key: "Enter", ctrlKey: true, bubbles: true });

    expect(onSaveEdit).not.toHaveBeenCalled();
    expect(screen.queryByTestId("comment-edit-field")).toBeNull();
  });

  it("calls onSaveEdit when user actually types new content after the editor fires onChangeHtml", async () => {
    const onSaveEdit = jest.fn();
    renderItem(onSaveEdit);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Edit comment" }));
    });

    expect(screen.getByTestId("comment-edit-field")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSaveEdit).not.toHaveBeenCalled();
  });
});
