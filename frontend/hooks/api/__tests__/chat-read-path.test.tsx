import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { invalidateChatReconnect, recordInboundChannelMessage } from "@/lib/chat-read-state";
import type { Channel, ChannelPage, Message, MessagesPage, ThreadPage } from "@/types/chat";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada", image: null } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: true }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

const mockedGet = jest.mocked(apiClient.get);
const { useCan } = jest.requireMock("@/hooks/api/access") as { useCan: jest.Mock };

const CHANNEL_ID = 7;
const messagesKey = collaborationQueryKeys.chat.messages(CHANNEL_ID);

function freshClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function wrapperFor(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

function message(over: Partial<Message> = {}): Message {
  return {
    id: 1,
    channelId: CHANNEL_ID,
    senderId: "user-2",
    content: "hi",
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    reactions: {},
    createdAt: "2026-09-30T10:00:00.000Z",
    updatedAt: "2026-09-30T10:00:00.000Z",
    sender: { id: "user-2", name: "Bo", image: null },
    attachments: [],
    replyTo: null,
    ...over,
  };
}

function timelineIds(client: QueryClient): number[] {
  return client.getQueryData<InfiniteData<MessagesPage>>(messagesKey)?.pages.flatMap((p) => p.messages.map((m) => m.id)) ?? [];
}

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(true);
});

describe("usePrefetchChatChannel — instant channel switching", () => {
  it("returns a stable callback that warms the first message page and the channel detail", async () => {
    const { usePrefetchChatChannel, useChatMessages } = await import("@/hooks/api/chat-core-read");
    const client = freshClient();
    mockedGet.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith("/messages") ? { messages: [message()], nextCursor: null } : { id: CHANNEL_ID }),
    );
    const { result, rerender } = renderHook(() => usePrefetchChatChannel(), { wrapper: wrapperFor(client) });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    await act(async () => {
      result.current(CHANNEL_ID);
    });
    await waitFor(() => expect(timelineIds(client)).toEqual([1]));
    expect(mockedGet.mock.calls.map(([path]) => path)).toEqual(
      expect.arrayContaining([`/chat/channels/${CHANNEL_ID}/messages`, `/chat/channels/${CHANNEL_ID}`]),
    );
    const callsBefore = mockedGet.mock.calls.length;
    const messages = renderHook(() => useChatMessages(CHANNEL_ID), { wrapper: wrapperFor(client) });
    expect(messages.result.current.isLoading).toBe(false);
    expect(messages.result.current.data?.pages[0].messages[0].id).toBe(1);
    expect(mockedGet.mock.calls.length).toBe(callsBefore);
  });

  it("prefetches nothing for a viewer who cannot read chat", async () => {
    useCan.mockReturnValue(false);
    const { usePrefetchChatChannel } = await import("@/hooks/api/chat-core-read");
    const { result } = renderHook(() => usePrefetchChatChannel(), { wrapper: wrapperFor(freshClient()) });
    await act(async () => {
      result.current(CHANNEL_ID);
    });
    expect(mockedGet).not.toHaveBeenCalled();
  });
});

describe("ensureChatMessageLoaded — exact-message hydration", () => {
  it("seeds the timeline with the context window, whose next page is the older cursor", async () => {
    const { ensureChatMessageLoaded } = await import("@/hooks/api/chat-core-read");
    const client = freshClient();
    mockedGet.mockResolvedValue({
      messages: [message({ id: 40 }), message({ id: 41 }), message({ id: 42 })],
      targetMessageId: 41,
      olderCursor: 39,
      hasNewer: true,
    });
    await expect(ensureChatMessageLoaded(client, CHANNEL_ID, 41)).resolves.toBe(true);
    expect(mockedGet.mock.calls[0][0]).toBe(`/chat/channels/${CHANNEL_ID}/messages/41/context`);
    const data = client.getQueryData<InfiniteData<MessagesPage>>(messagesKey);
    expect(data?.pages).toHaveLength(1);
    expect(data?.pages[0].nextCursor).toBe(39);
    expect(timelineIds(client)).toEqual([40, 41, 42]);
  });

  it("does not fetch when the message is already in the timeline", async () => {
    const { ensureChatMessageLoaded } = await import("@/hooks/api/chat-core-read");
    const client = freshClient();
    client.setQueryData<InfiniteData<MessagesPage>>(messagesKey, {
      pages: [{ messages: [message({ id: 41 })], nextCursor: null }],
      pageParams: [undefined],
    });
    await expect(ensureChatMessageLoaded(client, CHANNEL_ID, 41)).resolves.toBe(true);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("answers false for a message the viewer cannot see, leaving the timeline alone", async () => {
    const { ensureChatMessageLoaded } = await import("@/hooks/api/chat-core-read");
    const client = freshClient();
    mockedGet.mockRejectedValue(new ApiError("Not found", 404));
    await expect(ensureChatMessageLoaded(client, CHANNEL_ID, 41)).resolves.toBe(false);
    expect(client.getQueryData(messagesKey)).toBeUndefined();
  });
});

describe("useThreadReplies keeps a failed read inline", () => {
  it("reports the error on the hook instead of throwing to the boundary", async () => {
    const { useThreadReplies } = await import("@/hooks/api/chat-search");
    mockedGet.mockRejectedValue(new ApiError("Server", 500));
    const { result } = renderHook(() => useThreadReplies(CHANNEL_ID, 1), { wrapper: wrapperFor(freshClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("inbound realtime state is patched, not refetched", () => {
  const myChannelsKey = collaborationQueryKeys.chat.myChannels();
  const row: Channel = {
    id: CHANNEL_ID,
    name: "general",
    type: "PUBLIC",
    avatarUrl: null,
    isArchived: false,
    entityType: null,
    entityId: null,
    members: [],
    memberCount: 2,
    membersTruncated: false,
    unreadCount: 1,
    lastMessage: null,
  };

  function seedRows(client: QueryClient, channels: Channel[]) {
    const data: InfiniteData<ChannelPage<Channel>> = { pages: [{ channels, nextCursor: null }], pageParams: [null] };
    client.setQueryData(myChannelsKey, data);
    client.setQueryData(collaborationQueryKeys.chat.unreadTotal(), { total: 1 });
  }

  it("a message for a background channel raises its badge, the total and moves it to the top", () => {
    const client = freshClient();
    seedRows(client, [{ ...row, id: 99, unreadCount: 0 }, row]);
    const invalidate = jest.spyOn(client, "invalidateQueries");
    recordInboundChannelMessage(client, {
      channelId: CHANNEL_ID,
      content: "new",
      senderName: "Bo",
      createdAt: "2026-09-30T12:00:00.000Z",
      countsAsUnread: true,
    });
    const channels = client.getQueryData<InfiniteData<ChannelPage<Channel>>>(myChannelsKey)?.pages[0].channels;
    expect(channels?.map((c) => c.id)).toEqual([CHANNEL_ID, 99]);
    expect(channels?.[0]).toEqual(expect.objectContaining({ unreadCount: 2, lastMessage: expect.objectContaining({ content: "new" }) }));
    expect(client.getQueryData(collaborationQueryKeys.chat.unreadTotal())).toEqual({ total: 2 });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("a message the viewer is reading updates the preview but not the unread count", () => {
    const client = freshClient();
    seedRows(client, [row]);
    recordInboundChannelMessage(client, {
      channelId: CHANNEL_ID,
      content: "new",
      senderName: "Bo",
      createdAt: "2026-09-30T12:00:00.000Z",
      countsAsUnread: false,
    });
    expect(client.getQueryData<InfiniteData<ChannelPage<Channel>>>(myChannelsKey)?.pages[0].channels[0].unreadCount).toBe(1);
    expect(client.getQueryData(collaborationQueryKeys.chat.unreadTotal())).toEqual({ total: 1 });
  });

  it("reconnect resync also refreshes the open thread of that channel", () => {
    const client = freshClient();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    invalidateChatReconnect(client, CHANNEL_ID);
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: collaborationQueryKeys.chat.threadsInChannel(CHANNEL_ID) }),
    );
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: messagesKey }));
  });
});

describe("mergeInboundMessage and thread replies", () => {
  it("fills in the attachments of an already-reconciled send from its realtime echo", async () => {
    const { mergeInboundMessage } = await import("@/features/chat/message-page-merge");
    const sent = message({ id: 501, attachments: [] });
    const echo = message({
      id: 501,
      attachments: [{ id: 9, fileName: "a.png", fileUrl: "u", fileKey: "k", fileSize: 1, mimeType: "image/png" }],
    });
    const merged = mergeInboundMessage({ pages: [{ messages: [sent], nextCursor: null }], pageParams: [undefined] }, echo, null);
    expect(merged.pages[0].messages).toHaveLength(1);
    expect(merged.pages[0].messages[0].attachments).toHaveLength(1);
  });

  it("appends an inbound reply to an open thread once, even when the echo repeats", async () => {
    const { appendThreadReply } = await import("@/features/chat/message-page-merge");
    const thread: InfiniteData<ThreadPage> = {
      pages: [{ parentMessage: message(), replies: [], nextCursor: null }],
      pageParams: [undefined],
    };
    const reply = message({ id: 2, replyToId: 1 });
    const once = appendThreadReply(thread, reply);
    const twice = appendThreadReply(once, reply);
    expect(twice?.pages[0].replies.map((m) => m.id)).toEqual([2]);
  });
});
