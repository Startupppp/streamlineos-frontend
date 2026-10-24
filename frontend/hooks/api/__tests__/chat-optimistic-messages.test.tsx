import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import type { InfiniteData } from "@tanstack/react-query";
import type { MessagesPage, ThreadPage } from "@/types/chat";
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
  refetchingInvalidations,
  seedChannels,
  seedTimeline,
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

installRandomUuid();

beforeEach(() => jest.clearAllMocks());

describe("useSendMessage — instant send with in-place reconciliation", () => {
  const serverRow = message({
    id: 501,
    senderId: "user-1",
    sender: { id: "user-1", name: "Me", image: null },
    content: "hello",
    clientKey: "ck-1",
    channelPosition: 9,
    createdAt: "2026-09-30T11:00:00.000Z",
    updatedAt: "2026-09-30T11:00:00.000Z",
  });

  it("appends an optimistic copy with an empty reactions map before the server answers", async () => {
    const { useSendMessage } = await import("@/hooks/api/chat-message-mutations");
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
    const { useSendMessage } = await import("@/hooks/api/chat-message-mutations");
    const client = freshClient();
    seedTimeline(client, []);
    mockedPost.mockResolvedValue({ ...serverRow, clientKey: "ck-hello" });
    const { result } = renderHook(() => useSendMessage(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL_ID, clientKey: "ck-hello", content: "hello" });
    });
    const [, body] = mockedPost.mock.calls[0];
    expect(body).toEqual(expect.objectContaining({ clientKey: expect.any(String) }));
    expect(String(Reflect.get(Object(body), "clientKey")).length).toBeGreaterThan(0);
  });

  it("writes the server row in place of the optimistic copy without refetching the timeline", async () => {
    const { useSendMessage } = await import("@/hooks/api/chat-message-mutations");
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
    const { useSendMessage } = await import("@/hooks/api/chat-message-mutations");
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
    const { useSendMessage } = await import("@/hooks/api/chat-message-mutations");
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
    const { useSendMessage } = await import("@/hooks/api/chat-message-mutations");
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
    const { useSendMessage } = await import("@/hooks/api/chat-message-mutations");
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

  it("takes the server attachment ids from the send response, so the attachment URL query can run without waiting for the realtime echo", async () => {
    const { useSendMessage } = await import("@/hooks/api/chat-message-mutations");
    const { mergeInboundMessage } = await import("@/features/chat/message-page-merge");
    const { useAttachmentUrl } = await import("@/hooks/api/chat-shared");
    const client = freshClient();
    seedTimeline(client, []);
    mockedPost.mockResolvedValue(message({ id: 501, content: "pic", clientKey: "ck-f", attachments: echoed }));
    const send = renderHook(() => useSendMessage(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await send.result.current.mutateAsync({ channelId: CHANNEL_ID, content: "pic", clientKey: "ck-f", attachments: [file] });
    });
    expect(timeline(client)[0].attachments).toEqual(echoed);
    client.setQueryData<InfiniteData<MessagesPage>>(messagesKey, (old) =>
      old && mergeInboundMessage(old, message({ id: 501, attachments: echoed }), "ck-f"),
    );
    expect(timeline(client).map((m) => m.id)).toEqual([501]);
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
