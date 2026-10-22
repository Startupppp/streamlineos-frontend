import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { MessagesPage } from "@/types/chat";
import { useChatRealtime } from "@/hooks/api/chat-realtime";
import { isForgedServerFrame } from "@/lib/ably-safe-subscribe";

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
    presence: {
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    },
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

describe("isForgedServerFrame on chat events", () => {
  it("accepts a server frame, which carries no clientId", () => {
    expect(isForgedServerFrame("message", undefined)).toBe(false);
    expect(isForgedServerFrame("message:updated", undefined)).toBe(false);
    expect(isForgedServerFrame("message:deleted", undefined)).toBe(false);
    expect(isForgedServerFrame("reaction:updated", undefined)).toBe(false);
  });

  it("rejects a browser-published frame on every server-authored event", () => {
    for (const event of [
      "message",
      "message:updated",
      "message:deleted",
      "reaction:updated",
    ] as const)
      expect(isForgedServerFrame(event, "user-2")).toBe(true);
  });

  it("rejects a browser frame even when it names ITS OWN publisher", () => {
    expect(isForgedServerFrame("message", "user-1")).toBe(true);
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
