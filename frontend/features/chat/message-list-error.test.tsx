import { createRef, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

import { MessageList } from "./message-list";
import type { Message } from "@/types/chat";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("./channel-join-state", () => ({
  ChannelJoinState: ({ channelName }: { channelName: string | null }) => <button type="button">Join #{channelName}</button>,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
}));

function renderList(element: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

function props(over: Partial<Parameters<typeof MessageList>[0]> = {}) {
  const noop = () => undefined;
  return {
    groupedMessages: [] as { date: string; messages: Message[] }[],
    messages: [] as Message[],
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
    ...over,
  };
}

describe("MessageList", () => {
  it("says the conversation could not be loaded and offers a retry", () => {
    const onRetry = jest.fn();
    renderList(<MessageList {...props({ isError: true, onRetry })} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/couldn't load/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("retries the history read when asked", () => {
    const onRetry = jest.fn();
    renderList(<MessageList {...props({ isError: true, onRetry })} />);

    screen.getByRole("button", { name: /try again/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers to join a public channel the reader is not in, instead of a retry that can never succeed", () => {
    renderList(<MessageList {...props({ isError: true, joinRequired: { channelName: "general" } })} />);
    expect(screen.getByRole("button", { name: "Join #general" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("does not claim failure for a channel that is genuinely empty", () => {
    renderList(<MessageList {...props()} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("prefers the skeleton over the error arm while the first page is in flight", () => {
    renderList(<MessageList {...props({ isLoading: true, isError: false })} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
