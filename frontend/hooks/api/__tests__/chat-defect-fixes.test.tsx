import { renderHook, act, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { resolveContract } from "@/lib/api-envelope";
import { isForgedServerFrame } from "@/lib/ably-safe-subscribe";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { chatMessageContract } from "@/hooks/api/chat-schema";
import {
  CHANNEL_ID,
  ablyMock,
  freshClient,
  message,
  seedTimeline,
  timeline,
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

const mockedPost = apiClient.post as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;
const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };

beforeEach(() => jest.clearAllMocks());

describe("F1 — the message contract keeps reactions", () => {
  const wire = Object.fromEntries(
    Object.entries({ ...message(), metadata: null }).filter(([key]) => key !== "reactions"),
  );

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
    const { useToggleReaction } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message({ reactions: { "👍": ["user-1"] } })]);
    mockedDelete.mockResolvedValue({ reactions: {} });
    const { result } = renderHook(() => useToggleReaction(CHANNEL_ID), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ messageId: 1, emoji: "👍" });
    });
    expect(mockedDelete.mock.calls[0][0]).toBe(
      `/chat/channels/${CHANNEL_ID}/messages/1/reactions/${encodeURIComponent("👍")}`,
    );
    expect(mockedPost).not.toHaveBeenCalled();
    expect(timeline(client)[0]?.reactions).toEqual({});
  });

  it("POSTs when the viewer has not reacted with that emoji", async () => {
    const { useToggleReaction } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message({ reactions: { "👍": ["user-2"] } })]);
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
    expect(timeline(client)[0]?.reactions).toEqual({ "👍": ["user-2", "user-1"] });
  });
});

describe("F4 — marking read moves the read marker in the channel detail without refetching it", () => {
  it("patches the viewer's lastReadAt in chat.channel(id) to the newest visible message", async () => {
    const { useMarkChannelRead } = await import("@/hooks/api/chat-core-mutations-a");
    const client = freshClient();
    seedTimeline(client, [message({ createdAt: "2026-09-30T10:00:00.000Z" })]);
    client.setQueryData(collaborationQueryKeys.chat.channel(CHANNEL_ID), {
      id: CHANNEL_ID,
      members: [{ userId: "user-1", lastReadAt: "2026-09-29T10:00:00.000Z" }],
    });
    const spy = jest.spyOn(client, "invalidateQueries");
    mockedPost.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useMarkChannelRead(), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync({ channelId: CHANNEL_ID });
    });
    expect(
      client.getQueryData<{ members: Array<{ lastReadAt: string }> }>(collaborationQueryKeys.chat.channel(CHANNEL_ID))
        ?.members[0].lastReadAt,
    ).toBe("2026-09-30T10:00:00.000Z");
    expect(spy).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: collaborationQueryKeys.chat.channel(CHANNEL_ID) }),
    );
  });
});

describe("F5 — the realtime echo of our own send replaces the optimistic copy", () => {
  it("swaps the negative-id message sharing the clientKey instead of appending", async () => {
    const { useChatRealtime } = await import("@/hooks/api/chat-realtime");
    const ably = ablyMock();
    useAbly.mockReturnValue(ably);
    const client = freshClient();
    seedTimeline(client, [message({ id: -123, senderId: "user-1", content: "mine", clientKey: "ck-9" })]);
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
    expect(timeline(client).map((m) => m.id)).toEqual([55]);
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
