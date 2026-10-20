import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import type { InfiniteData } from "@tanstack/react-query";
import type { MessagesPage, PinnedMessage, ThreadPage } from "@/types/chat";
import {
  CHANNEL_ID,
  channelRow,
  channelRows,
  deferred,
  freshClient,
  installRandomUuid,
  message,
  messagesKey,
  myChannelsKey,
  pinsKey,
  refetchingInvalidations,
  seedChannels,
  seedTimeline,
  threadKey,
  timeline,
  wrapperFor,
} from "@/hooks/api/chat-cache-test-harness";

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

installRandomUuid();

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

describe("useSendMessage — attachments and sidebar ordering", () => {
  it("shows the attachments in the optimistic copy under temporary ids", async () => {
    const { useSendMessage } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, []);
    mockedPost.mockReturnValue(deferred<Record<string, unknown>>().promise);
    const { result } = renderHook(() => useSendMessage(), { wrapper: wrapperFor(client) });
    const file = { fileName: "a.png", fileUrl: "u", fileKey: "k", fileSize: 3, mimeType: "image/png" };
    act(() => {
      result.current.mutate({ channelId: CHANNEL_ID, content: "pic", clientKey: "ck-a", attachments: [file] });
    });
    await waitFor(() => expect(timeline(client)).toHaveLength(1));
    const [attachment] = timeline(client)[0].attachments;
    expect(attachment).toEqual(expect.objectContaining(file));
    expect(attachment.id).toBeLessThan(0);
  });

  it("cancels an in-flight sidebar fetch before moving the row, so the fetch cannot overwrite the patch", async () => {
    const { useSendMessage } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, []);
    seedChannels(client, [channelRow()]);
    const cancel = jest.spyOn(client, "cancelQueries");
    mockedPost.mockReturnValue(deferred<Record<string, unknown>>().promise);
    const { result } = renderHook(() => useSendMessage(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate({ channelId: CHANNEL_ID, content: "x", clientKey: "ck-c" });
    });
    await waitFor(() => expect(channelRows(client)[0].lastMessage?.content).toBe("x"));
    expect(cancel).toHaveBeenCalledWith({ queryKey: myChannelsKey, exact: true });
  });
});

describe("a sent attachment gets its server id from the realtime echo", () => {
  const file = { fileName: "a.png", fileUrl: "u", fileKey: "k", fileSize: 3, mimeType: "image/png" };
  const echoed = [{ id: 77, ...file }];

  it("replaces the temporary attachment ids in the timeline, so the attachment URL query can run", async () => {
    const { useSendMessage } = await import("@/hooks/api/chat-core-mutations-a");
    const { mergeInboundMessage } = await import("@/features/chat/message-page-merge");
    const { useAttachmentUrl } = await import("@/hooks/api/chat-shared");
    const client = freshClient();
    seedTimeline(client, []);
    mockedPost.mockResolvedValue({
      id: 501, orgId: "org-1", channelId: CHANNEL_ID, senderMembershipId: 11, content: "pic", replyToId: null,
      isEdited: false, isDeleted: false, messageType: "text", metadata: null, actionStatus: null, clientKey: "ck-f",
      channelPosition: 9, createdAt: "2026-09-30T11:00:00.000Z", updatedAt: "2026-09-30T11:00:00.000Z",
    });
    const send = renderHook(() => useSendMessage(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await send.result.current.mutateAsync({ channelId: CHANNEL_ID, content: "pic", clientKey: "ck-f", attachments: [file] });
    });
    expect(timeline(client)[0].attachments[0].id).toBeLessThan(0);
    client.setQueryData<InfiniteData<MessagesPage>>(messagesKey, (old) =>
      old && mergeInboundMessage(old, message({ id: 501, attachments: echoed }), "ck-f"),
    );
    expect(timeline(client)[0].attachments).toEqual(echoed);
    const mockedGet = jest.mocked(apiClient.get);
    mockedGet.mockResolvedValue({ url: "https://files/a.png" });
    const url = renderHook(() => useAttachmentUrl(CHANNEL_ID, timeline(client)[0].attachments[0].id), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(url.result.current.data).toEqual({ url: "https://files/a.png" }));
  });

  it("replaces them in an open thread too", async () => {
    const { appendThreadReply } = await import("@/features/chat/message-page-merge");
    const reconciled = message({ id: 600, replyToId: 1, attachments: [{ id: -5, ...file }] });
    const thread: InfiniteData<ThreadPage> = {
      pages: [{ parentMessage: message(), replies: [reconciled], nextCursor: null }],
      pageParams: [undefined],
    };
    const merged = appendThreadReply(thread, { ...reconciled, attachments: echoed });
    expect(merged?.pages[0].replies[0].attachments).toEqual(echoed);
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

  it("sends a second toggle on the same emoji only after the first has been answered", async () => {
    const { useToggleReaction } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message()]);
    const first = deferred<{ reactions: Record<string, string[]> }>();
    mockedPost.mockReturnValue(first.promise);
    mockedDelete.mockResolvedValue({ reactions: {} });
    const { result } = renderHook(() => useToggleReaction(CHANNEL_ID), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate({ messageId: 1, emoji: "👍" });
    });
    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
    act(() => {
      result.current.mutate({ messageId: 1, emoji: "👍" });
    });
    await waitFor(() => expect(timeline(client)[0].reactions).toEqual({}));
    expect(mockedDelete).not.toHaveBeenCalled();
    await act(async () => first.resolve({ reactions: { "👍": ["user-1"] } }));
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledTimes(1));
  });

  it("does not let an earlier toggle's answer overwrite a newer optimistic state", async () => {
    const { useToggleReaction } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message()]);
    const first = deferred<{ reactions: Record<string, string[]> }>();
    const second = deferred<{ reactions: Record<string, string[]> }>();
    mockedPost.mockReturnValue(first.promise);
    mockedDelete.mockReturnValue(second.promise);
    const { result } = renderHook(() => useToggleReaction(CHANNEL_ID), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate({ messageId: 1, emoji: "🎉" });
    });
    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
    act(() => {
      result.current.mutate({ messageId: 1, emoji: "🎉" });
    });
    await waitFor(() => expect(timeline(client)[0].reactions).toEqual({}));
    await act(async () => first.resolve({ reactions: { "🎉": ["user-1"] } }));
    expect(timeline(client)[0].reactions).toEqual({});
    await act(async () => second.resolve({ reactions: {} }));
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledTimes(1));
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

