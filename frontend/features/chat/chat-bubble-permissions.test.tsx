import React from "react";
import { render, screen } from "@testing-library/react";
import { ChatBubble } from "./chat-bubble";
import type { Message } from "./chat-types";

const mockGranted = new Set<string>();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockGranted.has(key),
}));

jest.mock("./entity-actions-context", () => ({
  useEntityAction: () => null,
}));

jest.mock("next/dynamic", () => () => {
  function ActionsProbe(props: Record<string, unknown>) {
    const flags = ["canEdit", "canDelete", "canWrite", "canPin"]
      .map((key) => `${key}=${String(props[key])}`)
      .join(" ");
    return <output aria-label="action flags">{flags}</output>;
  }
  return ActionsProbe;
});

function message(senderId: string): Message {
  return {
    id: 42,
    channelId: 7,
    senderId,
    content: "hello",
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    sender: { id: senderId, name: "Ada", image: null },
    attachments: [],
    replyTo: null,
  };
}

const noop = () => undefined;

function renderBubble(isOwn: boolean) {
  render(
    <ChatBubble
      message={message(isOwn ? "user-1" : "user-2")}
      isOwn={isOwn}
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
    />,
  );
  return screen.getByRole("status", { name: "action flags" }).textContent;
}

beforeEach(() => {
  mockGranted.clear();
});

describe("ChatBubble — message actions follow the caller's permissions", () => {
  it("lets the author with chat:messages:write edit and delete, and pin with chat:messages:pin", () => {
    mockGranted.add("chat:messages:write");
    mockGranted.add("chat:messages:pin");
    expect(renderBubble(true)).toBe("canEdit=true canDelete=true canWrite=true canPin=true");
  });

  it("fails closed for the author while chat:messages:write and chat:messages:pin are not granted", () => {
    expect(renderBubble(true)).toBe("canEdit=false canDelete=false canWrite=false canPin=false");
  });

  it("never lets a writer edit or delete someone else's message", () => {
    mockGranted.add("chat:messages:write");
    expect(renderBubble(false)).toBe("canEdit=false canDelete=false canWrite=true canPin=false");
  });
});
