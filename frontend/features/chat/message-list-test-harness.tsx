import { createRef, type ReactNode } from "react";
import type { MessageList } from "./message-list";
import type { Message } from "@/types/chat";

jest.mock("./chat-bubble", () => ({
  ChatBubble: ({ message }: { message: { id: number; content: string } }) => (
    <div id={`message-${message.id}`}>{message.content}</div>
  ),
}));

jest.mock("./entity-actions-context", () => ({
  EntityActionsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function chatMessage(id: number): Message {
  return {
    id,
    channelId: 7,
    senderId: "user-2",
    sender: { id: "user-2", name: "Bo", image: null },
    content: `message ${id}`,
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    reactions: {},
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-20T09:00:00.000Z",
    attachments: [],
    replyTo: null,
  };
}

export function grouped(ids: number[]) {
  return [{ date: "Today", messages: ids.map(chatMessage) }];
}

export function props(over: Partial<Parameters<typeof MessageList>[0]> = {}) {
  const noop = () => undefined;
  const ids = [10, 11, 12];
  return {
    groupedMessages: grouped(ids),
    messages: ids.map(chatMessage),
    isLoading: false,
    isError: false,
    onRetry: noop,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
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
    scrollToMessageId: null,
    ...over,
  };
}

export const scrollIntoView = jest.fn();
export const layout = { scrollHeight: 2000, clientHeight: 600 };
export const observers: Array<{
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  disconnect: jest.Mock;
}> = [];

class MockIntersectionObserver {
  disconnect = jest.fn();
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    observers.push({ callback, options, disconnect: this.disconnect });
  }
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

export function installMessageListEnvironment() {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get: () => layout.scrollHeight,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => layout.clientHeight,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    layout.scrollHeight = 2000;
    layout.clientHeight = 600;
    observers.length = 0;
    Element.prototype.scrollIntoView = scrollIntoView;
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: MockIntersectionObserver,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });
}
