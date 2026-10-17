import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { resolveContract } from "@/lib/api-envelope";
import { isForgedServerFrame } from "@/lib/ably-safe-subscribe";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { chatMessageContract } from "@/hooks/api/chat-schema";
import type { Message, MessagesPage } from "@/types/chat";

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

const mockedPost = apiClient.post as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;
const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };
const { toast } = jest.requireMock("sonner") as { toast: jest.Mock };

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
    createdAt: "2026-09-30T10:00:00.000Z",
    updatedAt: "2026-09-30T10:00:00.000Z",
    sender: { id: "user-2", name: "Bo", image: null },
    attachments: [],
    replyTo: null,
    ...over,
  };
}

function seed(client: QueryClient, messages: Message[]) {
  const data: InfiniteData<MessagesPage> = { pages: [{ messages, nextCursor: null }], pageParams: [undefined] };
  client.setQueryData(messagesKey, data);
}

function cached(client: QueryClient): Message[] {
  return client.getQueryData<InfiniteData<MessagesPage>>(messagesKey)?.pages.flatMap((p) => p.messages) ?? [];
}

function ablyMock() {
  const handlers = new Map<string, Array<(msg: unknown) => void>>();
  const channel = {
    subscribe: jest.fn((event: string, handler: (msg: unknown) => void) => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      return Promise.resolve(undefined);
    }),
    unsubscribe: jest.fn(),
    publish: jest.fn().mockResolvedValue(undefined),
  };
  return {
    handlers,
    channels: { get: jest.fn().mockReturnValue(channel) },
    connection: { state: "connected", on: jest.fn(), off: jest.fn() },
  };
}

beforeEach(() => jest.clearAllMocks());

describe("F1 — the message contract keeps reactions", () => {
  const wire = {
    ...message(),
    metadata: null,
  };

  it("keeps the reactions map the backend sends", () => {
    const parsed = chatMessageContract.parse({ ...wire, reactions: { "👍": ["user-1"] } });
    expect(parsed.reactions).toEqual({ "👍": ["user-1"] });
  });

  it("defaults to an empty map when the field is absent", () => {
    expect(chatMessageContract.parse(wire).reactions).toEqual({});
  });
});

describe("F2 — a thread reply parses the raw row the endpoint answers", () => {
  it("posts the clientKey and accepts a response with no sender/attachments/replyTo", async () => {
    const { useSendThreadReply } = await import("@/hooks/api/chat-search");
    mockedPost.mockResolvedValue({});
    const { result } = renderHook(() => useSendThreadReply(CHANNEL_ID, 1), { wrapper: wrapperFor(freshClient()) });
    await act(async () => {
      await result.current.mutateAsync({ content: "re", clientKey: "ck-1" });
    });
    const [url, body, , contract] = mockedPost.mock.calls[0];
    expect(url).toBe(`/chat/channels/${CHANNEL_ID}/messages/1/thread`);
    expect(body).toEqual({ content: "re", clientKey: "ck-1" });
    const schema = await resolveContract(contract);
    const raw = {
      id: 9, orgId: "org-1", channelId: CHANNEL_ID, senderMembershipId: 3, content: "re", replyToId: 1,
      isEdited: false, isDeleted: false, messageType: "text", metadata: null, actionStatus: null,
      clientKey: "ck-1", channelPosition: 4, createdAt: "2026-09-30T10:00:00.000Z", updatedAt: "2026-09-30T10:00:00.000Z",
    };
    expect(schema?.safeParse(raw).success).toBe(true);
  });
});

describe("F3 — a reaction toggle removes what the viewer already added", () => {
  it("DELETEs (URL-encoded) when the viewer already reacted, then writes the answered map", async () => {
    const { useToggleReaction } = await import("@/hooks/api/chat-core-mutations-b");
    const client = freshClient();
    seed(client, [message({ reactions: { "👍": ["user-1"] } })]);
    mockedDelete.mockResolvedValue({ reactions: {} });
    const { result } = renderHook(() => useToggleReaction(CHANNEL_ID), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ messageId: 1, emoji: "👍" });
    });
    expect(mockedDelete.mock.calls[0][0]).toBe(
      `/chat/channels/${CHANNEL_ID}/messages/1/reactions/${encodeURIComponent("👍")}`,
    );
    expect(mockedPost).not.toHaveBeenCalled();
    expect(cached(client)[0]?.reactions).toEqual({});
  });

  it("POSTs when the viewer has not reacted with that emoji", async () => {
    const { useToggleReaction } = await import("@/hooks/api/chat-core-mutations-b");
    const client = freshClient();
    seed(client, [message({ reactions: { "👍": ["user-2"] } })]);
    mockedPost.mockResolvedValue({ reactions: { "👍": ["user-2", "user-1"] } });
    const { result } = renderHook(() => useToggleReaction(CHANNEL_ID), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ messageId: 1, emoji: "👍" });
    });
    expect(mockedPost.mock.calls[0].slice(0, 2)).toEqual([
      `/chat/channels/${CHANNEL_ID}/messages/1/reactions`,
      { emoji: "👍" },
    ]);
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(cached(client)[0]?.reactions).toEqual({ "👍": ["user-2", "user-1"] });
  });
});

describe("F4 — marking read refreshes the channel detail", () => {
  it("invalidates chat.channel(id), which carries lastReadAt", async () => {
    const { useMarkChannelRead } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    const spy = jest.spyOn(client, "invalidateQueries");
    mockedPost.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useMarkChannelRead(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL_ID });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: collaborationQueryKeys.chat.channel(CHANNEL_ID) });
  });
});

describe("F5 — the realtime echo of our own send replaces the optimistic copy", () => {
  it("swaps the negative-id message sharing the clientKey instead of appending", async () => {
    const { useChatRealtime } = await import("@/hooks/api/chat-realtime");
    const ably = ablyMock();
    useAbly.mockReturnValue(ably);
    const client = freshClient();
    seed(client, [message({ id: -123, senderId: "user-1", content: "mine", clientKey: "ck-9" })]);
    const { unmount } = renderHook(() => useChatRealtime(CHANNEL_ID), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(ably.handlers.get("message")?.length).toBe(1));
    act(() => {
      ably.handlers.get("message")?.[0]?.({
        data: {
          id: 55, channelId: CHANNEL_ID, senderId: "user-1", senderName: "Ada", content: "mine",
          createdAt: "2026-09-30T10:00:01.000Z", replyToId: null, metadata: null, clientKey: "ck-9",
        },
      });
    });
    expect(cached(client).map((m) => m.id)).toEqual([55]);
    unmount();
  });
});

describe("F7 — a DM or mention in an unloaded channel still moves the badges", () => {
  it("invalidates unread and toasts from the per-user notifications channel", async () => {
    const { useChatGlobalNotifications } = await import("@/hooks/api/chat-notifications");
    const ably = ablyMock();
    useAbly.mockReturnValue(ably);
    const client = freshClient();
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
    expect(spy).toHaveBeenCalledWith({ queryKey: collaborationQueryKeys.chat.unreadTotal(), exact: true });
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

describe("F8 — server-authored events published by a browser are forged", () => {
  it("drops chat and huddle server events carrying a clientId", () => {
    for (const event of ["message", "message:updated", "reaction:updated", "huddle:ended", "huddle:user_joined"])
      expect(isForgedServerFrame(event, "user-2")).toBe(true);
    expect(isForgedServerFrame("message", undefined)).toBe(false);
  });

  it("leaves the browser-published events alone", () => {
    expect(isForgedServerFrame("typing", "user-2")).toBe(false);
    expect(isForgedServerFrame("huddle:chat", "user-2")).toBe(false);
  });
});
