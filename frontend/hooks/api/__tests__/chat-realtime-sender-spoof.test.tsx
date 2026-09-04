import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { MessagesPage } from "@/types/chat";
import {
  useChatRealtime,
  isTrustedChatFrame,
} from "@/hooks/api/chat-realtime";

/**
 * A member of a channel can PUBLISH on it, so an inbound frame is not evidence of anything.
 *
 * The chat token grants every channel the caller belongs to
 * `["subscribe", "publish", "history"]` — `publish` is load-bearing, the typing indicator is
 * published from the browser — so any member can also publish a `message` frame onto the
 * channel. This hook took `payload.senderId` and `payload.senderName` from that frame and
 * wrote them into the message cache and into a desktop Notification, unverified. One member
 * could therefore make a message appear in every open window of the channel, attributed to a
 * colleague, saying whatever they chose. Nothing is persisted, which is what makes it quiet.
 *
 * `clientId` is the discriminator and cannot be forged: Ably stamps it from the identity in
 * the publisher's token. The backend publishes over REST with the API key and no clientId
 * (AblyService.publishChatMessage), so a genuine server frame has none; a browser frame always
 * has one, because every chat token is minted with `clientId: <userId>`.
 */

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada" } },
    status: "authenticated",
  }),
}));

jest.mock("ably/react", () => ({ useAbly: jest.fn() }));

jest.mock("@/lib/ably", () => ({
  reauthorizeAblyClients: jest.fn().mockResolvedValue(undefined),
}));

const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };

type Handler = (msg: { data: unknown; clientId?: string }) => void;

function makeAblyMock() {
  const handlers = new Map<string, Handler[]>();

  const channel = {
    subscribe: jest.fn().mockImplementation((event: string, handler: Handler) => {
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

function makeWrapper(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  Wrapper.displayName = "TestQueryWrapper";
  return Wrapper;
}

const CHANNEL_ID = 7;

function primedClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const empty: InfiniteData<MessagesPage> = {
    pages: [{ messages: [], nextCursor: null }],
    pageParams: [undefined],
  };
  client.setQueryData(queryKeys.chat.messages(CHANNEL_ID), empty);
  return client;
}

function messagesIn(client: QueryClient): { id: number; senderId: string }[] {
  const data = client.getQueryData<InfiniteData<MessagesPage>>(
    queryKeys.chat.messages(CHANNEL_ID),
  );
  return (data?.pages ?? []).flatMap((page) =>
    page.messages.map((message) => ({
      id: message.id,
      senderId: message.senderId ?? "",
    })),
  );
}

const FORGED = {
  id: 4242,
  channelId: CHANNEL_ID,
  senderId: "user-victim",
  senderName: "Grace (CEO)",
  senderImage: null,
  content: "approved, wire the funds",
  createdAt: new Date().toISOString(),
  replyToId: null,
  metadata: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isTrustedChatFrame", () => {
  it("accepts a server frame, which carries no clientId", () => {
    expect(isTrustedChatFrame("message", undefined, "user-2")).toBe(true);
    expect(isTrustedChatFrame("message:updated", undefined, undefined)).toBe(true);
    expect(isTrustedChatFrame("message:deleted", undefined, undefined)).toBe(true);
    expect(isTrustedChatFrame("reaction:updated", undefined, undefined)).toBe(true);
  });

  it("rejects a browser-published frame on every server-authored event", () => {
    for (const event of [
      "message",
      "message:updated",
      "message:deleted",
      "reaction:updated",
    ] as const)
      expect(isTrustedChatFrame(event, "user-2", "user-2")).toBe(false);
  });

  it("rejects a browser frame even when it names ITS OWN publisher", () => {
    // The rule is not "do not lie about who you are", it is "you are not the server".
    expect(isTrustedChatFrame("message", "user-1", "user-1")).toBe(false);
  });

  it("lets a typing frame speak only for its own publisher", () => {
    expect(isTrustedChatFrame("typing", "user-2", "user-2")).toBe(true);
    expect(isTrustedChatFrame("typing", "user-2", "user-victim")).toBe(false);
  });
});

describe("useChatRealtime — a forged message never reaches the cache", () => {
  it("drops a `message` frame published by a browser", async () => {
    const ably = makeAblyMock();
    useAbly.mockReturnValue(ably);
    const client = primedClient();

    const { unmount } = renderHook(() => useChatRealtime(CHANNEL_ID), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => {
      expect(ably.handlers.get("message")?.length).toBe(1);
    });

    const handler = ably.handlers.get("message")?.[0];
    if (handler === undefined) throw new Error("no message handler subscribed");

    act(() => {
      handler({ data: FORGED, clientId: "user-impostor" });
    });

    expect(messagesIn(client)).toEqual([]);

    unmount();
  });

  it("still accepts the same frame from the server, so the guard is not a mute button", async () => {
    const ably = makeAblyMock();
    useAbly.mockReturnValue(ably);
    const client = primedClient();

    const { unmount } = renderHook(() => useChatRealtime(CHANNEL_ID), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => {
      expect(ably.handlers.get("message")?.length).toBe(1);
    });

    const handler = ably.handlers.get("message")?.[0];
    if (handler === undefined) throw new Error("no message handler subscribed");

    act(() => {
      handler({ data: FORGED });
    });

    expect(messagesIn(client)).toEqual([
      { id: FORGED.id, senderId: FORGED.senderId },
    ]);

    unmount();
  });
});
