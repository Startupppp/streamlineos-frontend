import { createRef, type ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { MessageList } from "./message-list";
import type { Message } from "./chat-types";

const mockSentinel = jest.fn((_props: Record<string, unknown>) => null);

jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: (props: Record<string, unknown>) => mockSentinel(props),
}));

jest.mock("./chat-bubble", () => ({
  ChatBubble: ({ message }: { message: { id: number; content: string } }) => (
    <div id={`message-${message.id}`}>{message.content}</div>
  ),
}));

jest.mock("./entity-actions-context", () => ({
  EntityActionsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

function chatMessage(id: number): Message {
  return {
    id,
    channelId: 7,
    senderId: "user-2",
    content: `message ${id}`,
    createdAt: "2026-10-20T09:00:00.000Z",
    isDeleted: false,
  } as unknown as Message;
}

function grouped(ids: number[]) {
  return [{ date: "Today", messages: ids.map(chatMessage) }];
}

function props(over: Partial<Parameters<typeof MessageList>[0]> = {}) {
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

let scrollIntoView: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  scrollIntoView = jest.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("MessageList — older history loads by infinite scroll, never a button", () => {
  it("renders no 'Load older messages' button", () => {
    render(<MessageList {...props({ showScrollBtn: true })} />);
    expect(screen.queryByRole("button", { name: /older/i })).toBeNull();
  });

  it("puts an IntersectionObserver sentinel at the top once the reader leaves the bottom", () => {
    render(<MessageList {...props({ showScrollBtn: true })} />);
    expect(mockSentinel).toHaveBeenCalledWith(
      expect.objectContaining({ hasNextPage: true, isFetchingNextPage: false }),
    );
  });

  it("holds the sentinel back while the reader sits at the latest message, so opening a channel does not pull an extra page", () => {
    render(<MessageList {...props({ showScrollBtn: false })} />);
    expect(mockSentinel).not.toHaveBeenCalled();
  });

  it("the sentinel's load fetches the next older page", () => {
    const fetchNextPage = jest.fn();
    render(<MessageList {...props({ showScrollBtn: true, fetchNextPage })} />);
    const sentinelProps = mockSentinel.mock.calls[mockSentinel.mock.calls.length - 1][0];
    const onLoadMore = sentinelProps.onLoadMore;
    if (typeof onLoadMore !== "function") throw new Error("sentinel has no onLoadMore");
    act(() => {
      onLoadMore();
    });
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});

describe("MessageList — ?message lands on the exact message", () => {
  it("scrolls to and highlights a message that is already loaded, without fetching", () => {
    const fetchNextPage = jest.fn();
    const { container } = render(
      <MessageList {...props({ scrollToMessageId: 11, fetchNextPage })} />,
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalled();
    expect(container.querySelector('[data-anchored="true"] #message-11')).not.toBeNull();
  });

  it("fetches older pages until the target message is present, then scrolls to it", () => {
    const fetchNextPage = jest.fn();
    const { rerender, container } = render(
      <MessageList {...props({ scrollToMessageId: 3, fetchNextPage })} />,
    );
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    rerender(
      <MessageList
        {...props({ scrollToMessageId: 3, fetchNextPage, isFetchingNextPage: true })}
      />,
    );
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    rerender(
      <MessageList
        {...props({
          scrollToMessageId: 3,
          fetchNextPage,
          groupedMessages: grouped([5, 6, 10, 11, 12]),
        })}
      />,
    );
    expect(fetchNextPage).toHaveBeenCalledTimes(2);

    rerender(
      <MessageList
        {...props({
          scrollToMessageId: 3,
          fetchNextPage,
          groupedMessages: grouped([2, 3, 5, 6, 10, 11, 12]),
        })}
      />,
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(fetchNextPage).toHaveBeenCalledTimes(2);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(container.querySelector('[data-anchored="true"] #message-3')).not.toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("when history runs out without the message, says it is no longer available and asks the page to drop ?message", () => {
    const listener = jest.fn();
    window.addEventListener("chat:message-unavailable", listener);
    render(
      <MessageList {...props({ scrollToMessageId: 3, hasNextPage: false })} />,
    );
    window.removeEventListener("chat:message-unavailable", listener);

    expect(toast.error).toHaveBeenCalledWith("That message is no longer available");
    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0];
    expect(event instanceof CustomEvent ? event.detail : null).toBe(3);
  });

  it("stops after a bounded number of older pages even when the server keeps offering more", () => {
    const fetchNextPage = jest.fn();
    const { rerender } = render(
      <MessageList {...props({ scrollToMessageId: 3, fetchNextPage })} />,
    );
    for (let page = 0; page < 40; page += 1) {
      const ids = Array.from({ length: page + 4 }, (_, i) => 1000 + page * 10 + i);
      rerender(
        <MessageList
          {...props({ scrollToMessageId: 3, fetchNextPage, groupedMessages: grouped(ids) })}
        />,
      );
    }
    expect(fetchNextPage.mock.calls.length).toBeLessThanOrEqual(25);
    expect(toast.error).toHaveBeenCalledWith("That message is no longer available");
  });

  it("waits for the first page before deciding anything", () => {
    const fetchNextPage = jest.fn();
    render(
      <MessageList
        {...props({ scrollToMessageId: 3, fetchNextPage, isLoading: true, hasNextPage: undefined })}
      />,
    );
    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
