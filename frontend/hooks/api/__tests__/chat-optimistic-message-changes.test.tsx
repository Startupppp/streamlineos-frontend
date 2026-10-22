import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import type { InfiniteData } from "@tanstack/react-query";
import type { PinnedMessage, ThreadPage } from "@/types/chat";
import {
  CHANNEL_ID,
  deferred,
  freshClient,
  installRandomUuid,
  message,
  pinsKey,
  refetchingInvalidations,
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
    const { useToggleReaction } = await import("@/hooks/api/chat-reaction-mutation");
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
    const { useToggleReaction } = await import("@/hooks/api/chat-reaction-mutation");
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
    const { useToggleReaction } = await import("@/hooks/api/chat-reaction-mutation");
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
    const { useToggleReaction } = await import("@/hooks/api/chat-reaction-mutation");
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
    const { useToggleReaction } = await import("@/hooks/api/chat-reaction-mutation");
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
