import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import type { Channel, ChannelPage, OrgUser, PublicChannel } from "@/types/chat";

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

const mockedPost = jest.mocked(apiClient.post);
const { useCan } = jest.requireMock("@/hooks/api/access") as { useCan: jest.Mock };

const CHANNEL_ID = 7;
const myChannelsKey = collaborationQueryKeys.chat.myChannels();
const archivedKey = collaborationQueryKeys.chat.archivedChannels();
const publicKey = collaborationQueryKeys.chat.publicChannels();
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

const ownPreview: Channel["members"][number] = {
  id: 11,
  channelId: CHANNEL_ID,
  userId: "user-1",
  role: "MEMBER",
  mutedUntil: null,
  isFavorite: false,
  notificationPreference: "DEFAULT",
  user: { id: "user-1", name: "Ada", image: null },
};

function channelRow(over: Partial<Channel> = {}): Channel {
  return {
    id: CHANNEL_ID,
    name: "general",
    type: "PUBLIC",
    avatarUrl: null,
    isArchived: false,
    entityType: null,
    entityId: null,
    members: [ownPreview],
    memberCount: 2,
    membersTruncated: false,
    unreadCount: 0,
    lastMessage: { content: "hi", senderName: "Bo", createdAt: "2026-09-30T10:00:00.000Z" },
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
        ...ownPreview,
        lastReadAt: null,
        joinedAt: "2026-09-01T10:00:00.000Z",
        archivedAt: null,
        user: { id: "user-1", name: "Ada", image: null, email: "ada@example.com" },
      },
    ],
    ...over,
  };
}

function seedList<T>(client: QueryClient, key: readonly unknown[], channels: T[]) {
  const data: InfiniteData<ChannelPage<T>> = { pages: [{ channels, nextCursor: null }], pageParams: [null] };
  client.setQueryData(key, data);
}

function rows<T = Channel>(client: QueryClient, key: readonly unknown[]): T[] {
  return client.getQueryData<InfiniteData<ChannelPage<T>>>(key)?.pages.flatMap((p) => p.channels) ?? [];
}

function refetchingInvalidations(spy: jest.SpyInstance) {
  return spy.mock.calls.filter(([filters]) => filters?.refetchType !== "none");
}

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(true);
});

describe("archive and unarchive move the row instantly", () => {
  it("useArchiveChannel moves the row to the archive before the server answers and never refetches", async () => {
    const { useArchiveChannel } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    seedList(client, myChannelsKey, [channelRow()]);
    seedList<Channel>(client, archivedKey, []);
    const pending = deferred<{ ok: true }>();
    mockedPost.mockReturnValue(pending.promise);
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useArchiveChannel(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate(CHANNEL_ID);
    });
    await waitFor(() => expect(rows(client, myChannelsKey)).toEqual([]));
    expect(rows(client, archivedKey).map((c) => c.id)).toEqual([CHANNEL_ID]);
    await act(async () => pending.resolve({ ok: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(refetchingInvalidations(invalidate)).toEqual([]);
  });

  it("useUnarchiveChannel puts the row back in the archive when the server refuses", async () => {
    const { useUnarchiveChannel } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    seedList<Channel>(client, myChannelsKey, []);
    seedList(client, archivedKey, [channelRow()]);
    mockedPost.mockRejectedValue(new ApiError("Forbidden", 403));
    const { result } = renderHook(() => useUnarchiveChannel(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync(CHANNEL_ID).catch(() => undefined);
    });
    expect(rows(client, archivedKey).map((c) => c.id)).toEqual([CHANNEL_ID]);
    expect(rows(client, myChannelsKey)).toEqual([]);
  });
});

describe("personal channel settings patch the viewer's membership", () => {
  it("useMuteChannel shows the channel muted at once and keeps the server's mutedUntil", async () => {
    const { useMuteChannel } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    seedList(client, myChannelsKey, [channelRow()]);
    client.setQueryData(detailKey, detail());
    const pending = deferred<{ ok: true; mutedUntil: string }>();
    mockedPost.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useMuteChannel(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate({ channelId: CHANNEL_ID, duration: "1h" });
    });
    await waitFor(() => expect(rows(client, myChannelsKey)[0].members[0].mutedUntil).not.toBeNull());
    expect(client.getQueryData<ChatChannelDetailWire>(detailKey)?.members[0].mutedUntil).not.toBeNull();
    await act(async () => pending.resolve({ ok: true, mutedUntil: "2026-10-21T12:00:00.000Z" }));
    await waitFor(() =>
      expect(rows(client, myChannelsKey)[0].members[0].mutedUntil).toBe("2026-10-21T12:00:00.000Z"),
    );
  });

  it("useFavoriteChannel stars the channel at once and unstars it again on failure", async () => {
    const { useFavoriteChannel } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    seedList(client, myChannelsKey, [channelRow()]);
    const pending = deferred<{ ok: true }>();
    mockedPost.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useFavoriteChannel(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate(CHANNEL_ID);
    });
    await waitFor(() => expect(rows(client, myChannelsKey)[0].members[0].isFavorite).toBe(true));
    await act(async () => pending.reject(new ApiError("Forbidden", 403)));
    await waitFor(() => expect(rows(client, myChannelsKey)[0].members[0].isFavorite).toBe(false));
  });

  it("useMarkChannelUnread raises the badge and the total before the server answers", async () => {
    const { useMarkChannelUnread } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    seedList(client, myChannelsKey, [channelRow()]);
    client.setQueryData(unreadKey, { total: 2 });
    mockedPost.mockReturnValue(deferred<{ ok: true }>().promise);
    const { result } = renderHook(() => useMarkChannelUnread(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate(CHANNEL_ID);
    });
    await waitFor(() => expect(rows(client, myChannelsKey)[0].unreadCount).toBe(1));
    expect(client.getQueryData(unreadKey)).toEqual({ total: 3 });
  });
});

describe("join and leave are instant", () => {
  const listed: PublicChannel = {
    id: CHANNEL_ID,
    name: "general",
    description: null,
    avatarUrl: null,
    type: "PUBLIC",
    createdAt: "2026-09-01T10:00:00.000Z",
    lastMessageAt: "2026-09-30T10:00:00.000Z",
    memberCount: 4,
    isMember: false,
  };

  it("useJoinChannel lists the channel as joined before the server answers", async () => {
    const { useJoinChannel } = await import("@/hooks/api/chat-core-mutations-b");
    const client = freshClient();
    seedList<Channel>(client, myChannelsKey, []);
    seedList(client, publicKey, [listed]);
    const pending = deferred<{ ok: true }>();
    mockedPost.mockReturnValue(pending.promise);
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useJoinChannel(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate(CHANNEL_ID);
    });
    await waitFor(() => expect(rows(client, myChannelsKey).map((c) => c.id)).toEqual([CHANNEL_ID]));
    expect(rows<PublicChannel>(client, publicKey)[0]).toEqual(
      expect.objectContaining({ isMember: true, memberCount: 5 }),
    );
    await act(async () => pending.resolve({ ok: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(refetchingInvalidations(invalidate)).toEqual([]);
  });

  it("useLeaveChannel drops the row and its unread count, and restores both on failure", async () => {
    const { useLeaveChannel } = await import("@/hooks/api/chat-core-mutations-b");
    const client = freshClient();
    seedList(client, myChannelsKey, [channelRow({ unreadCount: 2 })]);
    client.setQueryData(unreadKey, { total: 5 });
    const pending = deferred<{ ok: true }>();
    mockedPost.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useLeaveChannel(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate(CHANNEL_ID);
    });
    await waitFor(() => expect(rows(client, myChannelsKey)).toEqual([]));
    expect(client.getQueryData(unreadKey)).toEqual({ total: 3 });
    await act(async () => pending.reject(new ApiError("Forbidden", 403)));
    await waitFor(() => expect(rows(client, myChannelsKey).map((c) => c.id)).toEqual([CHANNEL_ID]));
    expect(client.getQueryData(unreadKey)).toEqual({ total: 5 });
  });
});

describe("creating a conversation is instant", () => {
  it("useCreateDMChannel shows a placeholder row, then swaps in the server channel and seeds its detail", async () => {
    const { useCreateDMChannel } = await import("@/hooks/api/chat-core-mutations-b");
    const client = freshClient();
    seedList<Channel>(client, myChannelsKey, []);
    const bo: OrgUser = { id: "user-2", name: "Bo", email: "bo@example.com", image: null, role: null };
    client.setQueryData<OrgUser[]>(collaborationQueryKeys.chat.orgUsers(), [bo]);
    const pending = deferred<ChatChannelDetailWire>();
    mockedPost.mockReturnValue(pending.promise);
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateDMChannel(), { wrapper: wrapperFor(client) });
    act(() => {
      result.current.mutate({ targetUserId: "user-2" });
    });
    await waitFor(() => expect(rows(client, myChannelsKey)).toHaveLength(1));
    const placeholder = rows(client, myChannelsKey)[0];
    expect(placeholder.id).toBeLessThan(0);
    expect(placeholder.members.map((m) => m.userId)).toEqual(["user-1", "user-2"]);
    await act(async () => pending.resolve(detail({ id: 42, type: "DIRECT", name: "" })));
    await waitFor(() => expect(rows(client, myChannelsKey).map((c) => c.id)).toEqual([42]));
    expect(client.getQueryData(collaborationQueryKeys.chat.channel(42))).toEqual(
      expect.objectContaining({ id: 42 }),
    );
    expect(refetchingInvalidations(invalidate)).toEqual([]);
  });

  it("useCreatePublicChannel removes the placeholder when the server refuses", async () => {
    const { useCreatePublicChannel } = await import("@/hooks/api/chat-core-mutations-b");
    const client = freshClient();
    seedList(client, myChannelsKey, [channelRow()]);
    mockedPost.mockRejectedValue(new ApiError("Conflict", 409));
    const { result } = renderHook(() => useCreatePublicChannel(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ name: "new", memberIds: [] }).catch(() => undefined);
    });
    expect(rows(client, myChannelsKey).map((c) => c.id)).toEqual([CHANNEL_ID]);
  });
});

describe("useChannelInviteLink mints through a mutation, never a POST inside a query", () => {
  it("mints once when enabled and returns the token in the same { data, isLoading } shape", async () => {
    const { useChannelInviteLink } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    mockedPost.mockResolvedValue({ token: "tok-1" });
    const { result } = renderHook(() => useChannelInviteLink(CHANNEL_ID, true), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.data).toEqual({ token: "tok-1" }));
    expect(result.current.isLoading).toBe(false);
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedPost.mock.calls[0][0]).toBe(`/chat/channels/${CHANNEL_ID}/invite-link`);
  });

  it("useRegenerateInviteLink writes the new token in place without re-minting", async () => {
    const { useChannelInviteLink, useRegenerateInviteLink } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    mockedPost.mockResolvedValueOnce({ token: "tok-1" }).mockResolvedValueOnce({ token: "tok-2" });
    const link = renderHook(() => useChannelInviteLink(CHANNEL_ID, true), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(link.result.current.data).toEqual({ token: "tok-1" }));
    const regenerate = renderHook(() => useRegenerateInviteLink(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await regenerate.result.current.mutateAsync({ channelId: CHANNEL_ID });
    });
    await waitFor(() => expect(link.result.current.data).toEqual({ token: "tok-2" }));
    expect(mockedPost).toHaveBeenCalledTimes(2);
  });

  it("mints once under StrictMode's double effect run", async () => {
    const { useChannelInviteLink } = await import("@/hooks/api/chat-personal-b");
    const { StrictMode, createElement } = await import("react");
    const client = freshClient();
    mockedPost.mockResolvedValue({ token: "tok-1", expiresAt: null, maxUses: null, useCount: 0 });
    const Inner = wrapperFor(client);
    function Strict({ children }: { children: ReactNode }) {
      return createElement(StrictMode, null, createElement(Inner, null, children));
    }
    const { result } = renderHook(() => useChannelInviteLink(CHANNEL_ID, true), { wrapper: Strict });
    await waitFor(() => expect(result.current.data?.token).toBe("tok-1"));
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("re-mints when the link's server expiry passes", async () => {
    const { useChannelInviteLink } = await import("@/hooks/api/chat-personal-b");
    const client = freshClient();
    mockedPost
      .mockResolvedValueOnce({ token: "tok-1", expiresAt: new Date(Date.now() + 50).toISOString(), maxUses: null, useCount: 0 })
      .mockResolvedValueOnce({ token: "tok-2", expiresAt: null, maxUses: null, useCount: 0 });
    const { result } = renderHook(() => useChannelInviteLink(CHANNEL_ID, true), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.data?.token).toBe("tok-1"));
    await waitFor(() => expect(result.current.data?.token).toBe("tok-2"));
    expect(mockedPost).toHaveBeenCalledTimes(2);
  });

  it("does not mint when the viewer cannot manage invite links", async () => {
    useCan.mockReturnValue(false);
    const { useChannelInviteLink } = await import("@/hooks/api/chat-personal-b");
    const { result } = renderHook(() => useChannelInviteLink(CHANNEL_ID, true), {
      wrapper: wrapperFor(freshClient()),
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockedPost).not.toHaveBeenCalled();
  });
});
