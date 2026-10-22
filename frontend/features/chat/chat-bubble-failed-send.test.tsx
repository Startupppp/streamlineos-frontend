import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UNSCOPED } from "@/lib/org-scoped-storage";
import type { Message } from "@/types/chat";
import { ChatBubble } from "./chat-bubble";
import { appendOutboxEntry, chatDraftKey, readOutbox } from "./composer-draft";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("./entity-actions-context", () => ({
  useEntityAction: () => null,
}));

jest.mock("next/dynamic", () => () => function DynamicStub() {
  return jest.requireActual("react").createElement("div", { "data-testid": "message-actions" });
});

const DRAFT_KEY = chatDraftKey(7, UNSCOPED);

function pending(clientKey: string, id = -3): Message {
  return {
    id,
    channelId: 7,
    senderId: "user-1",
    content: "hello",
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    reactions: {},
    clientKey,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sender: { id: "user-1", name: "Ada", image: null },
    attachments: [],
    replyTo: null,
  };
}

const noop = () => undefined;

function renderBubble(message: Message) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ChatBubble
        message={message}
        isOwn
        showSender
        isEditing={false}
        editInput=""
        currentUserId="user-1"
        onEditInputChange={noop}
        onStartEdit={noop}
        onCancelEdit={noop}
        onSaveEdit={noop}
        onReply={noop}
        onOpenThread={noop}
        onDelete={noop}
        onReact={noop}
        onPin={noop}
        onUnpin={noop}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => localStorage.clear());

describe("ChatBubble — a send that failed", () => {
  it("shows Not sent with Retry and Discard, and is no longer marked busy", () => {
    appendOutboxEntry(DRAFT_KEY, { content: "hello", clientKey: "k-1", failed: true });
    const { container } = renderBubble(pending("k-1"));

    expect(screen.getByText("Not sent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
    expect(container.querySelector("[aria-busy]")).toBeNull();
  });

  it("negative control: a send still in flight shows no failure actions and stays busy", () => {
    appendOutboxEntry(DRAFT_KEY, { content: "hello", clientKey: "k-2" });
    const { container } = renderBubble(pending("k-2"));

    expect(screen.queryByText("Not sent")).toBeNull();
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
  });

  it("Retry puts the entry back on the queue at the tail and the failure actions disappear", () => {
    appendOutboxEntry(DRAFT_KEY, { content: "hello", clientKey: "k-1", failed: true });
    appendOutboxEntry(DRAFT_KEY, { content: "later", clientKey: "k-2" });
    renderBubble(pending("k-1"));

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(readOutbox(DRAFT_KEY).map((entry) => [entry.clientKey, entry.failed])).toEqual([
      ["k-2", undefined],
      ["k-1", false],
    ]);
    expect(screen.queryByText("Not sent")).toBeNull();
  });

  it("Discard drops the entry", () => {
    appendOutboxEntry(DRAFT_KEY, { content: "hello", clientKey: "k-1", failed: true });
    renderBubble(pending("k-1"));

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(readOutbox(DRAFT_KEY)).toEqual([]);
  });
});

describe("ChatBubble — a message that has not reached the server", () => {
  it("a Not sent row offers only Retry and Discard: no toolbar, no delivered tick", () => {
    appendOutboxEntry(DRAFT_KEY, { content: "hello", clientKey: "k-1", failed: true });
    renderBubble(pending("k-1"));

    expect(screen.queryByTestId("message-actions")).toBeNull();
    expect(screen.queryByRole("img", { name: "Delivered" })).toBeNull();
    expect(screen.queryByText("Sending…")).toBeNull();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Retry", "Discard"]);
  });

  it("a pending row shows Sending… with no toolbar and no delivered tick", () => {
    appendOutboxEntry(DRAFT_KEY, { content: "hello", clientKey: "k-2" });
    renderBubble(pending("k-2"));

    expect(screen.getByText("Sending…")).toBeInTheDocument();
    expect(screen.queryByTestId("message-actions")).toBeNull();
    expect(screen.queryByRole("img", { name: "Delivered" })).toBeNull();
    expect(screen.queryAllByRole("button")).toEqual([]);
  });

  it("positive control: a delivered row keeps its toolbar and delivered tick", () => {
    renderBubble(pending("k-3", 42));

    expect(screen.getByTestId("message-actions")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Delivered" })).toBeInTheDocument();
    expect(screen.queryByText("Sending…")).toBeNull();
    expect(screen.queryByText("Not sent")).toBeNull();
  });
});
