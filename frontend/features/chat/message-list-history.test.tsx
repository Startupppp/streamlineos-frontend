import { createRef, type ReactElement, type ReactNode } from "react";
import { act, render as rtlRender, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { ensureChatMessageLoaded } from "@/hooks/api/chat-core-read";
import { MessageList } from "./message-list";
import type { Message } from "./chat-types";

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

jest.mock("@/hooks/api/chat-core-read", () => ({
  ensureChatMessageLoaded: jest.fn(),
}));

const mockEnsureLoaded = jest.mocked(ensureChatMessageLoaded);

let queryClient: QueryClient;

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: Providers });
}

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
const layout = { scrollHeight: 2000, clientHeight: 600 };
const observers: Array<{
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
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockEnsureLoaded.mockResolvedValue(true);
  jest.useFakeTimers();
  layout.scrollHeight = 2000;
  layout.clientHeight = 600;
  observers.length = 0;
  scrollIntoView = jest.fn();
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

function fireIntersection() {
  const observer = observers[observers.length - 1];
  act(() => {
    observer.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
}

describe("MessageList — older history loads by infinite scroll, never a button", () => {
  it("shows no visible 'Load older' button; the only control is the sentinel's keyboard fallback", () => {
    const fetchNextPage = jest.fn();
    render(<MessageList {...props({ showScrollBtn: true, fetchNextPage })} />);
    const fallback = screen.getByRole("button", { name: "Load older messages" });
    expect(fallback).toHaveClass("sr-only");
    expect(fallback.closest("[aria-hidden]")).toBeNull();
    act(() => {
      fallback.click();
    });
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("drops the keyboard fallback once history is exhausted", () => {
    render(<MessageList {...props({ showScrollBtn: true, hasNextPage: false })} />);
    expect(screen.queryByRole("button", { name: /older/i })).toBeNull();
  });

  it("observes the top sentinel inside the conversation's scroll viewport, not the window", () => {
    const scrollContainerRef = createRef<HTMLDivElement>();
    render(<MessageList {...props({ showScrollBtn: true, scrollContainerRef })} />);
    expect(observers).toHaveLength(1);
    expect(observers[0].options?.root).toBe(scrollContainerRef.current);
    expect(scrollContainerRef.current).not.toBeNull();
  });

  it("holds the observer back while the reader sits at the latest message, so opening a channel does not pull an extra page", () => {
    const fetchNextPage = jest.fn();
    render(<MessageList {...props({ showScrollBtn: false, fetchNextPage })} />);
    expect(observers).toHaveLength(0);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("the sentinel coming into view fetches the next older page", () => {
    const fetchNextPage = jest.fn();
    render(<MessageList {...props({ showScrollBtn: true, fetchNextPage })} />);
    fireIntersection();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("loads older history when the first page does not fill the viewport, so there is nothing to scroll", () => {
    layout.scrollHeight = 400;
    const fetchNextPage = jest.fn();
    const groupedMessages = grouped([10, 11, 12]);
    const { rerender } = render(<MessageList {...props({ fetchNextPage, groupedMessages })} />);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    rerender(
      <MessageList {...props({ fetchNextPage, groupedMessages, isFetchingNextPage: true })} />,
    );
    rerender(<MessageList {...props({ fetchNextPage, groupedMessages })} />);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    rerender(<MessageList {...props({ fetchNextPage, groupedMessages: grouped([9, 10, 11, 12]) })} />);
    expect(fetchNextPage).toHaveBeenCalledTimes(2);
  });

  it("restores the reader's distance from the bottom after older messages are prepended", () => {
    const fetchNextPage = jest.fn();
    const scrollContainerRef = createRef<HTMLDivElement>();
    const { rerender } = render(
      <MessageList {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef })} />,
    );
    const viewport = scrollContainerRef.current;
    if (!viewport) throw new Error("no viewport");
    viewport.scrollTop = 100;
    fireIntersection();

    rerender(
      <MessageList
        {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef, isFetchingNextPage: true })}
      />,
    );
    layout.scrollHeight = 2600;
    rerender(
      <MessageList
        {...props({
          showScrollBtn: true,
          fetchNextPage,
          scrollContainerRef,
          groupedMessages: grouped([7, 8, 9, 10, 11, 12]),
        })}
      />,
    );
    expect(viewport.scrollTop).toBe(700);
  });
});

describe("MessageList — a failed older-page fetch leaves no stale scroll restore", () => {
  it("forgets the pending restore once the fetch settles without new content", () => {
    const fetchNextPage = jest.fn();
    const scrollContainerRef = createRef<HTMLDivElement>();
    const groupedMessages = grouped([10, 11, 12]);
    const { rerender } = render(
      <MessageList {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef, groupedMessages })} />,
    );
    const viewport = scrollContainerRef.current;
    if (!viewport) throw new Error("no viewport");
    viewport.scrollTop = 100;
    fireIntersection();
    rerender(
      <MessageList
        {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef, groupedMessages, isFetchingNextPage: true })}
      />,
    );
    rerender(
      <MessageList {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef, groupedMessages })} />,
    );

    layout.scrollHeight = 2100;
    rerender(
      <MessageList
        {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef, groupedMessages: grouped([10, 11, 12, 13]) })}
      />,
    );
    expect(viewport.scrollTop).toBe(100);
  });
});

describe("MessageList — the older-history guards key on content, not array identity", () => {
  it("does not auto-fetch again when the same messages re-render as a new array after a failed fetch", () => {
    layout.scrollHeight = 400;
    const fetchNextPage = jest.fn();
    const { rerender } = render(<MessageList {...props({ fetchNextPage })} />);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    rerender(<MessageList {...props({ fetchNextPage, isFetchingNextPage: true })} />);
    rerender(<MessageList {...props({ fetchNextPage, groupedMessages: grouped([10, 11, 12]) })} />);
    rerender(<MessageList {...props({ fetchNextPage, groupedMessages: grouped([10, 11, 12]) })} />);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("a fetch that adds no older page never restores scroll later, even while more history is advertised", () => {
    const fetchNextPage = jest.fn();
    const scrollContainerRef = createRef<HTMLDivElement>();
    const { rerender } = render(
      <MessageList {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef })} />,
    );
    const viewport = scrollContainerRef.current;
    if (!viewport) throw new Error("no viewport");
    viewport.scrollTop = 100;
    fireIntersection();

    layout.scrollHeight = 2100;
    rerender(
      <MessageList
        {...props({
          showScrollBtn: true,
          fetchNextPage,
          scrollContainerRef,
          hasNextPage: true,
          groupedMessages: grouped([10, 11, 12, 13]),
        })}
      />,
    );
    expect(viewport.scrollTop).toBe(100);

    layout.scrollHeight = 2700;
    rerender(
      <MessageList
        {...props({
          showScrollBtn: true,
          fetchNextPage,
          scrollContainerRef,
          hasNextPage: true,
          groupedMessages: grouped([4, 5, 10, 11, 12, 13]),
        })}
      />,
    );
    expect(viewport.scrollTop).toBe(100);
  });
});

describe("MessageList — the older-history keyboard fallback keeps focus when it unmounts", () => {
  it("moves focus to the conversation's scroll viewport before the fetch removes the button", () => {
    const scrollContainerRef = createRef<HTMLDivElement>();
    const fetchNextPage = jest.fn();
    const { rerender } = render(
      <MessageList {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef })} />,
    );
    const fallback = screen.getByRole("button", { name: "Load older messages" });
    act(() => {
      fallback.focus();
      fallback.click();
    });
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(scrollContainerRef.current);

    rerender(
      <MessageList
        {...props({ showScrollBtn: true, fetchNextPage, scrollContainerRef, isFetchingNextPage: true })}
      />,
    );
    expect(screen.queryByRole("button", { name: "Load older messages" })).toBeNull();
    expect(document.activeElement).toBe(scrollContainerRef.current);
  });
});

async function flushAnchor() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("MessageList — ?message lands on the exact message through the context endpoint", () => {
  it("scrolls to and highlights a message that is already rendered, without asking the server", () => {
    const fetchNextPage = jest.fn();
    const { container } = render(
      <MessageList {...props({ scrollToMessageId: 11, fetchNextPage })} />,
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockEnsureLoaded).not.toHaveBeenCalled();
    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalled();
    expect(container.querySelector('[data-anchored="true"] #message-11')).not.toBeNull();
  });

  it("hydrates a message outside the loaded pages from its context window instead of paging history", async () => {
    const fetchNextPage = jest.fn();
    const { rerender, container } = render(
      <MessageList {...props({ scrollToMessageId: 3, fetchNextPage })} />,
    );
    await flushAnchor();
    expect(mockEnsureLoaded).toHaveBeenCalledTimes(1);
    expect(mockEnsureLoaded).toHaveBeenCalledWith(queryClient, 7, 3);
    expect(fetchNextPage).not.toHaveBeenCalled();

    rerender(
      <MessageList
        {...props({ scrollToMessageId: 3, fetchNextPage, groupedMessages: grouped([2, 3, 4]) })}
      />,
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockEnsureLoaded).toHaveBeenCalledTimes(1);
    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalled();
    expect(container.querySelector('[data-anchored="true"] #message-3')).not.toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("when the server says the message is gone or forbidden, says it is no longer available and asks the page to drop ?message", async () => {
    mockEnsureLoaded.mockResolvedValue(false);
    const listener = jest.fn();
    window.addEventListener("chat:message-unavailable", listener);
    render(<MessageList {...props({ scrollToMessageId: 3 })} />);
    await flushAnchor();
    window.removeEventListener("chat:message-unavailable", listener);

    expect(toast.error).toHaveBeenCalledWith("That message is no longer available");
    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0];
    expect(event instanceof CustomEvent ? event.detail : null).toBe(3);
  });

  it("a failed context read is reported with its own message and still drops ?message", async () => {
    mockEnsureLoaded.mockRejectedValue(new Error("Network unreachable"));
    const listener = jest.fn();
    window.addEventListener("chat:message-unavailable", listener);
    render(<MessageList {...props({ scrollToMessageId: 3 })} />);
    await flushAnchor();
    window.removeEventListener("chat:message-unavailable", listener);

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalledWith("That message is no longer available");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("ignores a context answer that arrives after the reader moved on", async () => {
    let settle: (found: boolean) => void = () => undefined;
    mockEnsureLoaded.mockReturnValue(
      new Promise<boolean>((resolve) => {
        settle = resolve;
      }),
    );
    const { rerender } = render(<MessageList {...props({ scrollToMessageId: 3 })} />);
    rerender(<MessageList {...props({ scrollToMessageId: null })} />);
    await act(async () => {
      settle(false);
      await Promise.resolve();
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("waits for the first page before deciding anything", async () => {
    render(
      <MessageList {...props({ scrollToMessageId: 3, isLoading: true, hasNextPage: undefined })} />,
    );
    await flushAnchor();
    expect(mockEnsureLoaded).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
