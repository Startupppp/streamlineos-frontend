import { createRef, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

import { MessageList } from "../message-list";
import type { Message } from "../chat-types";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
}));

function renderList(element: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

function chatMessage(id: number): Message {
  return {
    id,
    channelId: 7,
    senderId: "user-1",
    content: `body-${id}`,
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    sender: { id: "user-1", name: "Ada", image: null },
    attachments: [],
    replyTo: null,
  };
}

function props(messages: Message[]) {
  const noop = () => undefined;
  return {
    groupedMessages: [{ date: "Today", messages }],
    messages,
    isLoading: false,
    isError: false,
    onRetry: noop,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: noop,
    currentUserId: "user-1",
    channelId: 7,
    displayName: "general",
    channelType: "PUBLIC",
    editingMessage: null,
    editInput: "",
    pinnedMessageIds: new Set<number>(),
    savedMessageIds: new Set<number>(),
    replyCountMap: new Map<number, number>(),
    firstUnreadMessageId: undefined,
    onEditInputChange: noop,
    onStartEdit: noop,
    onCancelEdit: noop,
    onSaveEdit: noop,
    onReply: noop,
    onOpenThread: noop,
    onDelete: noop,
    onReact: noop,
    onPin: noop,
    onUnpin: noop,
    onSave: noop,
    onUnsaveMsg: noop,
    onForward: noop,
    showScrollBtn: false,
    scrollToBottom: noop,
    messagesEndRef: createRef<HTMLDivElement>(),
    scrollContainerRef: createRef<HTMLDivElement>(),
    onScroll: noop,
  };
}

describe("message timeline — a message still in flight says so", () => {
  it("marks the optimistic row aria-busy", () => {
    const { container } = renderList(<MessageList {...props([chatMessage(-1736)])} />);
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(1);
  });

  it("an acknowledged message carries no pending affordance", () => {
    const { container } = renderList(<MessageList {...props([chatMessage(42)])} />);
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
  });

  it("only the in-flight row is marked when both are on screen", () => {
    const { container } = renderList(
      <MessageList {...props([chatMessage(42), chatMessage(-1736)])} />,
    );
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(1);
  });
});
