import { renderHook, act, waitFor } from "@testing-library/react";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import {
  CHANNEL_ID,
  ablyMock,
  freshClient,
  wrapperFor,
} from "@/hooks/api/chat-cache-test-harness";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  isApiError: () => false,
  getApiErrorCode: () => undefined,
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

jest.mock("ably/react", () => ({ useAbly: jest.fn() }));
jest.mock("@/lib/ably", () => ({ reauthorizeAblyClients: jest.fn().mockResolvedValue(undefined) }));
jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));

const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };
const { toast } = jest.requireMock("sonner") as { toast: jest.Mock };

beforeEach(() => jest.clearAllMocks());

describe("F7 — a DM or mention in an unloaded channel still moves the badges", () => {
  it("patches the unread total, refetches the list that lacks the row, and toasts from the per-user notifications channel", async () => {
    const { useChatGlobalNotifications } = await import("@/hooks/api/chat-notifications");
    const ably = ablyMock();
    useAbly.mockReturnValue(ably);
    const client = freshClient();
    client.setQueryData(collaborationQueryKeys.chat.unreadTotal(), { total: 2 });
    const spy = jest.spyOn(client, "invalidateQueries");
    const { unmount } = renderHook(() => useChatGlobalNotifications([], null, "user-1"), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(ably.handlers.get("notification:message")?.length).toBe(1));
    act(() => {
      ably.handlers.get("notification:message")?.[0]?.({
        data: { channelId: 99, messageId: 1, senderId: "user-2", senderName: "Bo", channelType: "DIRECT" },
      });
    });
    expect(client.getQueryData(collaborationQueryKeys.chat.unreadTotal())).toEqual({ total: 3 });
    expect(spy).toHaveBeenCalledWith({ queryKey: collaborationQueryKeys.chat.myChannels(), exact: true });
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: collaborationQueryKeys.chat.unreadTotal() }));
    expect(toast).toHaveBeenCalledWith("Bo", expect.anything());

    spy.mockClear();
    act(() => {
      ably.handlers.get("notification:mention")?.[0]?.({
        data: { channelId: 99, messageId: 2, senderId: "user-2", senderName: "Bo" },
        clientId: "user-2",
      });
    });
    expect(spy).not.toHaveBeenCalled();
    unmount();
  });
});

describe("F7b — a message and its mention count once", () => {
  it("adds one to the unread total when notification:message and notification:mention name the same message", async () => {
    const { useChatGlobalNotifications } = await import("@/hooks/api/chat-notifications");
    const ably = ablyMock();
    useAbly.mockReturnValue(ably);
    const client = freshClient();
    client.setQueryData(collaborationQueryKeys.chat.unreadTotal(), { total: 2 });
    const { unmount } = renderHook(() => useChatGlobalNotifications([], null, "user-1"), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(ably.handlers.get("notification:mention")?.length).toBe(1));
    act(() => {
      ably.handlers.get("notification:message")?.[0]?.({
        data: { channelId: 99, messageId: 7, senderId: "user-2", senderName: "Bo", channelType: "GROUP" },
      });
      ably.handlers.get("notification:mention")?.[0]?.({
        data: { channelId: 99, messageId: 7, senderId: "user-2", senderName: "Bo" },
      });
    });
    expect(client.getQueryData(collaborationQueryKeys.chat.unreadTotal())).toEqual({ total: 3 });
    unmount();
  });
});

describe("F7c — a deleted unread message in a background channel stops counting", () => {
  it("decrements that channel's badge and the total, and leaves the open channel to its own realtime hook", async () => {
    const { useChatGlobalNotifications } = await import("@/hooks/api/chat-notifications");
    const ably = ablyMock();
    useAbly.mockReturnValue(ably);
    const client = freshClient();
    const row = {
      id: 42, name: "random", type: "PUBLIC" as const, avatarUrl: null, isArchived: false, entityType: null,
      entityId: null, members: [], memberCount: 2, membersTruncated: false, unreadCount: 0, lastMessage: null,
    };
    client.setQueryData(collaborationQueryKeys.chat.myChannels(), { pages: [{ channels: [row], nextCursor: null }], pageParams: [null] });
    client.setQueryData(collaborationQueryKeys.chat.unreadTotal(), { total: 0 });
    const { unmount } = renderHook(() => useChatGlobalNotifications([row], CHANNEL_ID, "user-1"), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(ably.handlers.get("message:deleted")?.length).toBe(1));
    act(() => {
      ably.handlers.get("message")?.[0]?.({
        data: { id: 900, channelId: 42, senderId: "user-2", senderName: "Bo", content: "hey", createdAt: "2026-10-01T10:00:00.000Z" },
      });
    });
    expect(client.getQueryData(collaborationQueryKeys.chat.unreadTotal())).toEqual({ total: 1 });
    act(() => {
      ably.handlers.get("message:deleted")?.[0]?.({ data: { id: 900, channelId: 42 } });
    });
    expect(client.getQueryData(collaborationQueryKeys.chat.unreadTotal())).toEqual({ total: 0 });
    const rows = client.getQueryData<{ pages: Array<{ channels: Array<{ unreadCount: number }> }> }>(
      collaborationQueryKeys.chat.myChannels(),
    );
    expect(rows?.pages[0].channels[0].unreadCount).toBe(0);
    unmount();
  });
});

describe("F7d — a counted message that was read before it was deleted does not lower the badge", () => {
  it("keeps the newer unread count when an older, already-read message is deleted", async () => {
    const { useChatGlobalNotifications } = await import("@/hooks/api/chat-notifications");
    const ably = ablyMock();
    useAbly.mockReturnValue(ably);
    const client = freshClient();
    const row = {
      id: 42, name: "random", type: "PUBLIC" as const, avatarUrl: null, isArchived: false, entityType: null,
      entityId: null, members: [], memberCount: 2, membersTruncated: false, unreadCount: 0, lastMessage: null,
    };
    const listKey = collaborationQueryKeys.chat.myChannels();
    const unreadTotal = collaborationQueryKeys.chat.unreadTotal();
    client.setQueryData(listKey, { pages: [{ channels: [row], nextCursor: null }], pageParams: [null] });
    client.setQueryData(unreadTotal, { total: 0 });
    const { unmount } = renderHook(() => useChatGlobalNotifications([row], CHANNEL_ID, "user-1"), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(ably.handlers.get("message:deleted")?.length).toBe(1));
    const deliver = (id: number) =>
      ably.handlers.get("message")?.[0]?.({
        data: { id, channelId: 42, senderId: "user-2", senderName: "Bo", content: "m", createdAt: "2026-10-01T10:00:00.000Z" },
      });
    act(() => {
      deliver(900);
    });
    act(() => {
      client.setQueryData(listKey, { pages: [{ channels: [{ ...row, unreadCount: 0 }], nextCursor: null }], pageParams: [null] });
      client.setQueryData(unreadTotal, { total: 0 });
    });
    act(() => {
      deliver(901);
    });
    expect(client.getQueryData(unreadTotal)).toEqual({ total: 1 });
    act(() => {
      ably.handlers.get("message:deleted")?.[0]?.({ data: { id: 900, channelId: 42 } });
    });
    expect(client.getQueryData(unreadTotal)).toEqual({ total: 1 });
    act(() => {
      ably.handlers.get("message:deleted")?.[0]?.({ data: { id: 901, channelId: 42 } });
    });
    expect(client.getQueryData(unreadTotal)).toEqual({ total: 0 });
    unmount();
  });
});
