import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import type { InfiniteData } from "@tanstack/react-query";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import type { PinnedMessage, SavedMessagesPage, ThreadPage } from "@/types/chat";
import {
  CHANNEL_ID,
  channelRow,
  channelRows,
  deferred,
  detail,
  detailKey,
  freshClient,
  installRandomUuid,
  message,
  pinsKey,
  refetchingInvalidations,
  savedKey,
  seedChannels,
  seedTimeline,
  threadKey,
  threadReplies,
  unreadKey,
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
const mockedDelete = jest.mocked(apiClient.delete);

installRandomUuid();

beforeEach(() => jest.clearAllMocks());

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

  it("asks the server for the unread total once when the channel's row is not loaded, because it cannot be computed", async () => {
    const { useMarkChannelRead } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    client.setQueryData(unreadKey, { total: 5 });
    const invalidate = jest.spyOn(client, "invalidateQueries");
    mockedPost.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useMarkChannelRead(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL_ID });
    });
    expect(invalidate.mock.calls).toEqual([[{ queryKey: unreadKey, exact: true }]]);
  });

  it("does not refetch the total when the row was loaded and patched", async () => {
    const { useMarkChannelRead } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedChannels(client, [channelRow({ unreadCount: 2 })]);
    client.setQueryData(unreadKey, { total: 5 });
    const invalidate = jest.spyOn(client, "invalidateQueries");
    mockedPost.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useMarkChannelRead(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL_ID });
    });
    expect(invalidate).not.toHaveBeenCalled();
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
