import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import type {
  Channel,
  ChannelPage,
  Message,
  MessagesPage,
  PinnedMessage,
  SavedMessagesPage,
  ThreadPage,
} from "@/types/chat";

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

jest.mock("@/hooks/api/authorized-mutation", () => {
  const { useMutation } = jest.requireActual("@tanstack/react-query");
  return { useAuthorizedMutation: (_scope: string, options: unknown) => useMutation(options) };
});

jest.mock("@/lib/ably", () => ({ reauthorizeAblyClients: jest.fn().mockResolvedValue(undefined) }));
jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));

const mockedPost = jest.mocked(apiClient.post);
const mockedPatch = jest.mocked(apiClient.patch);
const mockedDelete = jest.mocked(apiClient.delete);

const CHANNEL_ID = 7;
const messagesKey = collaborationQueryKeys.chat.messages(CHANNEL_ID);
const threadKey = collaborationQueryKeys.chat.thread(CHANNEL_ID, 1);
const pinsKey = collaborationQueryKeys.chat.pins(CHANNEL_ID);
const savedKey = collaborationQueryKeys.chat.savedMessages();
const myChannelsKey = collaborationQueryKeys.chat.myChannels();
const unreadKey = collaborationQueryKeys.chat.unreadTotal();
const detailKey = collaborationQueryKeys.chat.channel(CHANNEL_ID);

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

function channelRow(over: Partial<Channel> = {}): Channel {
  return {
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
    unreadCount: 0,
    lastMessage: null,
    ...over,
  };
}

function detail(over: Partial<ChatChannelDetailWire> = {}): ChatChannelDetailWire {
  return {
    id: CHANNEL_ID,
    orgId: "org-1",
    name: "general",
    description: null,
    type: "PUBLIC",
    avatarUrl: null,
    isArchived: false,
    entityType: null,
    entityId: null,
    isPinned: false,
    isPrivate: false,
    messageCount: 2,
    lastMessageAt: "2026-09-30T10:00:00.000Z",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    members: [
      {
        id: 11,
        channelId: CHANNEL_ID,
        userId: "user-1",
        role: "MEMBER",
        mutedUntil: null,
        isFavorite: false,
        notificationPreference: "DEFAULT",
        lastReadAt: "2026-09-30T09:00:00.000Z",
        joinedAt: "2026-09-01T10:00:00.000Z",
        archivedAt: null,
        user: { id: "user-1", name: "Ada", image: null, email: "ada@example.com" },
      },
    ],
    ...over,
  };
}

function seedTimeline(client: QueryClient, messages: Message[]) {
  const data: InfiniteData<MessagesPage> = { pages: [{ messages, nextCursor: null }], pageParams: [undefined] };
  client.setQueryData(messagesKey, data);
}

function seedChannels(client: QueryClient, channels: Channel[]) {
  const data: InfiniteData<ChannelPage<Channel>> = { pages: [{ channels, nextCursor: null }], pageParams: [null] };
  client.setQueryData(myChannelsKey, data);
}

function timeline(client: QueryClient): Message[] {
  return client.getQueryData<InfiniteData<MessagesPage>>(messagesKey)?.pages.flatMap((p) => p.messages) ?? [];
}

function threadReplies(client: QueryClient): Message[] {
  return client.getQueryData<InfiniteData<ThreadPage>>(threadKey)?.pages.flatMap((p) => p.replies) ?? [];
}

function channelRows(client: QueryClient): Channel[] {
  return client.getQueryData<InfiniteData<ChannelPage<Channel>>>(myChannelsKey)?.pages.flatMap((p) => p.channels) ?? [];
}

function refetchingInvalidations(spy: jest.SpyInstance) {
  return spy.mock.calls.filter(([filters]) => filters?.refetchType !== "none");
}

let nextUuid = 0;

beforeAll(() => {
  if (typeof globalThis.crypto?.randomUUID !== "function")
    Object.defineProperty(globalThis, "crypto", {
      writable: true,
      configurable: true,
      value: {
        ...globalThis.crypto,
        randomUUID: () => `00000000-0000-4000-8000-${String(++nextUuid).padStart(12, "0")}`,
      },
    });
});

beforeEach(() => jest.clearAllMocks());

describe("useSendMessage — instant send with in-place reconciliation", () => {
  const serverRow = {
    id: 501,
    orgId: "org-1",
    channelId: CHANNEL_ID,
    senderMembershipId: 11,
    content: "hello",
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    messageType: "text" as const,
    metadata: null,
    actionStatus: null,
    clientKey: "ck-1",
    channelPosition: 9,
    createdAt: "2026-09-30T11:00:00.000Z",
    updatedAt: "2026-09-30T11:00:00.000Z",
  };

  it("appends an optimistic copy with an empty reactions map before the server answers", async () => {
    const { useSendMessage } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message()]);
    const pending = deferred<typeof serverRow>();
    mockedPost.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useSendMessage(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate({ channelId: CHANNEL_ID, content: "hello", clientKey: "ck-1" });
    });
    await waitFor(() => expect(timeline(client)).toHaveLength(2));
    const optimistic = timeline(client)[1];
    expect(optimistic.id).toBeLessThan(0);
    expect(optimistic.reactions).toEqual({});
    expect(optimistic.clientKey).toBe("ck-1");
    expect(optimistic.senderId).toBe("user-1");
    await act(async () => pending.resolve(serverRow));
  });

  it("mints a clientKey when the caller omitted one and posts that same key", async () => {
    const { useSendMessage } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, []);
    mockedPost.mockResolvedValue({ ...serverRow, clientKey: null });
    const { result } = renderHook(() => useSendMessage(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL_ID, content: "hello" });
    });
    const [, body] = mockedPost.mock.calls[0];
    expect(body).toEqual(expect.objectContaining({ clientKey: expect.any(String) }));
    expect(String(Reflect.get(Object(body), "clientKey")).length).toBeGreaterThan(0);
  });

  it("writes the server row in place of the optimistic copy without refetching the timeline", async () => {
    const { useSendMessage } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message()]);
    seedChannels(client, [channelRow({ id: 99 }), channelRow()]);
    const invalidate = jest.spyOn(client, "invalidateQueries");
    mockedPost.mockResolvedValue(serverRow);
    const { result } = renderHook(() => useSendMessage(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL_ID, content: "hello", clientKey: "ck-1" });
    });
    expect(timeline(client).map((m) => m.id)).toEqual([1, 501]);
    expect(timeline(client)[1].sender.id).toBe("user-1");
    expect(channelRows(client)[0].id).toBe(CHANNEL_ID);
    expect(channelRows(client)[0].lastMessage?.content).toBe("hello");
    expect(refetchingInvalidations(invalidate)).toEqual([]);
  });

  it("removes the optimistic copy when the send finally fails", async () => {
    const { useSendMessage } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message()]);
    mockedPost.mockRejectedValue(new ApiError("Rejected", 400));
    const { result } = renderHook(() => useSendMessage(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL_ID, content: "x", clientKey: "ck-2" }).catch(() => undefined);
    });
    expect(timeline(client).map((m) => m.id)).toEqual([1]);
  });

  it("retries a transient network failure with the same clientKey instead of dropping the message", async () => {
    const { useSendMessage } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, []);
    mockedPost
      .mockRejectedValueOnce(new ApiError("Network error", undefined, "NETWORK_ERROR"))
      .mockResolvedValueOnce(serverRow);
    const { result } = renderHook(() => useSendMessage(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate({ channelId: CHANNEL_ID, content: "hello", clientKey: "ck-1" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 4_000 });
    expect(mockedPost).toHaveBeenCalledTimes(2);
    const keys = mockedPost.mock.calls.map(([, body]) => Reflect.get(Object(body), "clientKey"));
    expect(keys).toEqual(["ck-1", "ck-1"]);
    expect(timeline(client).map((m) => m.id)).toEqual([501]);
  });
});

describe("useEditMessage — optimistic edit", () => {
  it("patches the timeline, the open thread and the pin before the server answers", async () => {
    const { useEditMessage } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message()]);
    client.setQueryData<InfiniteData<ThreadPage>>(threadKey, {
      pages: [{ parentMessage: message(), replies: [], nextCursor: null }],
      pageParams: [undefined],
    });
    const pin: PinnedMessage = {
      id: 3,
      channelId: CHANNEL_ID,
      messageId: 1,
      pinnedAt: "2026-09-30T10:00:00.000Z",
      pinnedBy: "user-2",
      pinnedByUser: null,
      message: { ...message(), sender: { id: "user-2", name: "Bo", image: null } },
    };
    client.setQueryData<PinnedMessage[]>(pinsKey, [pin]);
    const pending = deferred<{ ok: true }>();
    mockedPatch.mockReturnValue(pending.promise);
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useEditMessage(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate({ channelId: CHANNEL_ID, messageId: 1, content: "edited" });
    });
    await waitFor(() => expect(timeline(client)[0].content).toBe("edited"));
    expect(timeline(client)[0].isEdited).toBe(true);
    expect(client.getQueryData<InfiniteData<ThreadPage>>(threadKey)?.pages[0].parentMessage.content).toBe("edited");
    expect(client.getQueryData<PinnedMessage[]>(pinsKey)?.[0].message.content).toBe("edited");
    await act(async () => pending.resolve({ ok: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(timeline(client)[0].content).toBe("edited");
    expect(refetchingInvalidations(invalidate)).toEqual([]);
  });

  it("restores the original text when the server refuses", async () => {
    const { useEditMessage } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message()]);
    mockedPatch.mockRejectedValue(new ApiError("Forbidden", 403));
    const { result } = renderHook(() => useEditMessage(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current
        .mutateAsync({ channelId: CHANNEL_ID, messageId: 1, content: "edited" })
        .catch(() => undefined);
    });
    expect(timeline(client)[0]).toEqual(expect.objectContaining({ content: "hi", isEdited: false }));
  });
});

describe("useDeleteMessage — optimistic delete", () => {
  it("tombstones the message at once and keeps it tombstoned without a refetch", async () => {
    const { useDeleteMessage } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message()]);
    const pending = deferred<{ ok: true }>();
    mockedDelete.mockReturnValue(pending.promise);
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useDeleteMessage(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate({ channelId: CHANNEL_ID, messageId: 1 });
    });
    await waitFor(() => expect(timeline(client)[0].isDeleted).toBe(true));
    expect(timeline(client)[0].content).toBeNull();
    await act(async () => pending.resolve({ ok: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(refetchingInvalidations(invalidate)).toEqual([]);
  });

  it("brings the message back when the delete fails", async () => {
    const { useDeleteMessage } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message()]);
    mockedDelete.mockRejectedValue(new ApiError("Forbidden", 403));
    const { result } = renderHook(() => useDeleteMessage(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL_ID, messageId: 1 }).catch(() => undefined);
    });
    expect(timeline(client)[0]).toEqual(expect.objectContaining({ content: "hi", isDeleted: false }));
  });
});

describe("useToggleReaction — optimistic toggle", () => {
  it("adds the viewer's reaction before the server answers, then writes the server map", async () => {
    const { useToggleReaction } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message()]);
    const pending = deferred<{ reactions: Record<string, string[]> }>();
    mockedPost.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useToggleReaction(CHANNEL_ID), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate({ messageId: 1, emoji: "👍" });
    });
    await waitFor(() => expect(timeline(client)[0].reactions).toEqual({ "👍": ["user-1"] }));
    expect(mockedPost).toHaveBeenCalledWith(
      `/chat/channels/${CHANNEL_ID}/messages/1/reactions`,
      { emoji: "👍" },
      undefined,
      expect.anything(),
    );
    await act(async () => pending.resolve({ reactions: { "👍": ["user-2", "user-1"] } }));
    await waitFor(() => expect(timeline(client)[0].reactions).toEqual({ "👍": ["user-2", "user-1"] }));
  });

  it("removes an existing reaction with the DELETE route, decided before the optimistic patch", async () => {
    const { useToggleReaction } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message({ reactions: { "👍": ["user-1"] } })]);
    mockedDelete.mockResolvedValue({ reactions: {} });
    const { result } = renderHook(() => useToggleReaction(CHANNEL_ID), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ messageId: 1, emoji: "👍" });
    });
    expect(mockedDelete).toHaveBeenCalledWith(
      `/chat/channels/${CHANNEL_ID}/messages/1/reactions/${encodeURIComponent("👍")}`,
      undefined,
      undefined,
      expect.anything(),
    );
    expect(mockedPost).not.toHaveBeenCalled();
    expect(timeline(client)[0].reactions).toEqual({});
  });

  it("rolls the reaction back when the server refuses", async () => {
    const { useToggleReaction } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message()]);
    mockedPost.mockRejectedValue(new ApiError("Forbidden", 403));
    const { result } = renderHook(() => useToggleReaction(CHANNEL_ID), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ messageId: 1, emoji: "👍" }).catch(() => undefined);
    });
    expect(timeline(client)[0].reactions).toEqual({});
  });
});

describe("useMarkChannelRead — optimistic read state", () => {
  it("zeroes the row, subtracts it from the total and moves lastReadAt forward before the server answers", async () => {
    const { useMarkChannelRead } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message({ id: 1, createdAt: "2026-09-30T10:00:00.000Z" })]);
    seedChannels(client, [channelRow({ unreadCount: 3 })]);
    client.setQueryData(unreadKey, { total: 5 });
    client.setQueryData(detailKey, detail());
    const pending = deferred<{ ok: true }>();
    mockedPost.mockReturnValue(pending.promise);
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useMarkChannelRead(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate({ channelId: CHANNEL_ID });
    });
    await waitFor(() => expect(channelRows(client)[0].unreadCount).toBe(0));
    expect(client.getQueryData(unreadKey)).toEqual({ total: 2 });
    expect(client.getQueryData<ChatChannelDetailWire>(detailKey)?.members[0].lastReadAt).toBe(
      "2026-09-30T10:00:00.000Z",
    );
    await act(async () => pending.resolve({ ok: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(refetchingInvalidations(invalidate)).toEqual([]);
  });

  it("never moves lastReadAt backwards when the visible window is older than the read marker", async () => {
    const { useMarkChannelRead } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message({ createdAt: "2026-09-29T10:00:00.000Z" })]);
    client.setQueryData(detailKey, detail());
    mockedPost.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useMarkChannelRead(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL_ID });
    });
    expect(client.getQueryData<ChatChannelDetailWire>(detailKey)?.members[0].lastReadAt).toBe(
      "2026-09-30T09:00:00.000Z",
    );
  });

  it("restores the unread badge when the mark fails", async () => {
    const { useMarkChannelRead } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedChannels(client, [channelRow({ unreadCount: 3 })]);
    client.setQueryData(unreadKey, { total: 5 });
    mockedPost.mockRejectedValue(new ApiError("Forbidden", 403));
    const { result } = renderHook(() => useMarkChannelRead(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL_ID }).catch(() => undefined);
    });
    expect(channelRows(client)[0].unreadCount).toBe(3);
    expect(client.getQueryData(unreadKey)).toEqual({ total: 5 });
  });
});

describe("useSendThreadReply — instant thread reply", () => {
  it("shows the reply at once and swaps in the server row without refetching the thread", async () => {
    const { useSendThreadReply } = await import("@/hooks/api/chat-search");
    const client = freshClient();
    client.setQueryData<InfiniteData<ThreadPage>>(threadKey, {
      pages: [{ parentMessage: message(), replies: [], nextCursor: null }],
      pageParams: [undefined],
    });
    const pending = deferred<Record<string, unknown>>();
    mockedPost.mockReturnValue(pending.promise);
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSendThreadReply(CHANNEL_ID, 1), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate({ content: "re", clientKey: "ck-t" });
    });
    await waitFor(() => expect(threadReplies(client)).toHaveLength(1));
    expect(threadReplies(client)[0].id).toBeLessThan(0);
    await act(async () =>
      pending.resolve({
        id: 900,
        orgId: "org-1",
        channelId: CHANNEL_ID,
        senderMembershipId: 11,
        content: "re",
        replyToId: 1,
        isEdited: false,
        isDeleted: false,
        messageType: "text",
        metadata: null,
        actionStatus: null,
        clientKey: "ck-t",
        channelPosition: 10,
        createdAt: "2026-09-30T11:00:00.000Z",
        updatedAt: "2026-09-30T11:00:00.000Z",
      }),
    );
    await waitFor(() => expect(threadReplies(client).map((m) => m.id)).toEqual([900]));
    expect(refetchingInvalidations(invalidate)).toEqual([]);
  });
});

describe("saved messages share the optimistic recipe", () => {
  it("useSaveMessage lists the message as saved before the server answers and unsave removes it", async () => {
    const { useSaveMessage, useUnsaveMessage } = await import("@/hooks/api/chat-personal-a");
    const client = freshClient();
    seedTimeline(client, [message()]);
    client.setQueryData<InfiniteData<SavedMessagesPage>>(savedKey, {
      pages: [{ items: [], nextCursor: undefined }],
      pageParams: [undefined],
    });
    const pending = deferred<{ ok: true }>();
    mockedPost.mockReturnValue(pending.promise);
    const save = renderHook(() => useSaveMessage(), { wrapper: wrapperFor(client) });
    act(() => {
      save.result.current.mutate(1);
    });
    const savedIds = () =>
      client.getQueryData<InfiniteData<SavedMessagesPage>>(savedKey)?.pages.flatMap((p) => p.items.map((i) => i.messageId));
    await waitFor(() => expect(savedIds()).toEqual([1]));
    await act(async () => pending.resolve({ ok: true }));
    mockedDelete.mockRejectedValue(new ApiError("Forbidden", 403));
    const unsave = renderHook(() => useUnsaveMessage(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await unsave.result.current.mutateAsync(1).catch(() => undefined);
    });
    expect(savedIds()).toEqual([1]);
    mockedDelete.mockResolvedValue({ ok: true });
    await act(async () => {
      await unsave.result.current.mutateAsync(1);
    });
    expect(savedIds()).toEqual([]);
  });
});

describe("pins share the optimistic recipe", () => {
  it("usePinMessage pins at once and useUnpinMessage restores the pin when the server refuses", async () => {
    const { usePinMessage, useUnpinMessage } = await import("@/hooks/api/chat-search");
    const client = freshClient();
    seedTimeline(client, [message()]);
    client.setQueryData<PinnedMessage[]>(pinsKey, []);
    const pending = deferred<{ ok: true }>();
    mockedPost.mockReturnValue(pending.promise);
    const pin = renderHook(() => usePinMessage(), { wrapper: wrapperFor(client) });
    act(() => {
      pin.result.current.mutate({ channelId: CHANNEL_ID, messageId: 1 });
    });
    const pinnedIds = () => client.getQueryData<PinnedMessage[]>(pinsKey)?.map((p) => p.messageId);
    await waitFor(() => expect(pinnedIds()).toEqual([1]));
    await act(async () => pending.resolve({ ok: true }));
    mockedDelete.mockRejectedValue(new ApiError("Forbidden", 403));
    const unpin = renderHook(() => useUnpinMessage(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await unpin.result.current.mutateAsync({ channelId: CHANNEL_ID, messageId: 1 }).catch(() => undefined);
    });
    expect(pinnedIds()).toEqual([1]);
  });
});
