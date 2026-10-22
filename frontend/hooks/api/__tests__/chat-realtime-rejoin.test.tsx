import { act, renderHook, waitFor } from "@testing-library/react";
import type { InfiniteData } from "@tanstack/react-query";
import type { InboundMessage } from "ably";
import { useChatRealtime } from "@/hooks/api/chat-realtime";
import { apiClient } from "@/lib/api-client";
import type { MessagesPage } from "@/types/chat";
import {
  CHANNEL_ID,
  freshClient,
  message,
  messagesKey,
  seedTimeline,
  wrapperFor,
} from "@/hooks/api/chat-cache-test-harness";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada" } },
    status: "authenticated",
  }),
}));
jest.mock("ably/react", () => ({ useAbly: jest.fn() }));
jest.mock("@/lib/ably", () => ({ reauthorizeAblyClients: jest.fn() }));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn().mockResolvedValue(undefined) },
}));

const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };
const { reauthorizeAblyClients } = jest.requireMock("@/lib/ably") as {
  reauthorizeAblyClients: jest.Mock;
};

function ablyError(statusCode: number, code: number): Error {
  return Object.assign(new Error(`ably ${code}`), { statusCode, code });
}

function leftChannelAbly() {
  const capability = { granted: false };
  const listeners = new Map<string, Array<(msg: InboundMessage) => void>>();
  const channel = {
    state: "failed",
    attach: jest.fn(async (): Promise<null> => {
      if (!capability.granted) {
        channel.state = "failed";
        throw ablyError(401, 40160);
      }
      channel.state = "attached";
      return null;
    }),
    subscribe: jest.fn(async (event: string, listener: (msg: InboundMessage) => void): Promise<null> => {
      if (channel.state === "failed") throw ablyError(400, 90001);
      listeners.set(event, [...(listeners.get(event) ?? []), listener]);
      return channel.attach();
    }),
    unsubscribe: jest.fn((event: string, listener: (msg: InboundMessage) => void) => {
      listeners.set(event, (listeners.get(event) ?? []).filter((entry) => entry !== listener));
    }),
    presence: {
      subscribe: jest.fn(async (): Promise<void> => {
        if (channel.state === "failed") throw ablyError(400, 90001);
      }),
      unsubscribe: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    },
  };
  reauthorizeAblyClients.mockImplementation(async () => {
    capability.granted = true;
  });
  return {
    channel,
    listeners,
    client: {
      channels: { get: jest.fn(() => channel) },
      connection: { state: "connected", on: jest.fn(), off: jest.fn() },
    },
  };
}

function inbound(id: number): InboundMessage {
  const frame: Partial<InboundMessage> = {
    data: {
      id,
      channelId: CHANNEL_ID,
      senderId: "user-2",
      senderName: "Bo",
      content: `live ${id}`,
      createdAt: "2026-10-21T10:00:00.000Z",
      replyToId: null,
    },
  };
  return frame as InboundMessage;
}

function cachedIds(client: ReturnType<typeof freshClient>): number[] {
  return (
    client
      .getQueryData<InfiniteData<MessagesPage>>(messagesKey)
      ?.pages.flatMap((page) => page.messages.map((m) => m.id)) ?? []
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useChatRealtime — rejoining a channel the client was refused on", () => {
  it("re-attaches the FAILED channel after the capability refresh and merges the next message live", async () => {
    const ably = leftChannelAbly();
    useAbly.mockReturnValue(ably.client);
    const client = freshClient();
    seedTimeline(client, [message({ id: 1 })]);

    const { result, rerender, unmount } = renderHook(
      ({ joinRequired }: { joinRequired: boolean }) => useChatRealtime(CHANNEL_ID, joinRequired),
      { wrapper: wrapperFor(client), initialProps: { joinRequired: true } },
    );
    expect(ably.channel.subscribe).not.toHaveBeenCalled();

    rerender({ joinRequired: false });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(reauthorizeAblyClients).toHaveBeenCalled();
    expect(ably.channel.state).toBe("attached");
    expect(ably.listeners.get("message")).toHaveLength(1);

    act(() => {
      ably.listeners.get("message")?.forEach((listener) => listener(inbound(2)));
    });

    expect(cachedIds(client)).toEqual([1, 2]);
    expect(jest.mocked(apiClient.get)).not.toHaveBeenCalled();
    await waitFor(() => expect(ably.channel.presence.subscribe).toHaveBeenCalled());
    unmount();
  });

  it("recovers when the first attach is refused before the new token lands", async () => {
    const ably = leftChannelAbly();
    ably.channel.state = "initialized";
    useAbly.mockReturnValue(ably.client);
    const client = freshClient();
    seedTimeline(client, [message({ id: 1 })]);

    const { result, unmount } = renderHook(() => useChatRealtime(CHANNEL_ID), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(ably.listeners.get("message")).toHaveLength(1);
    act(() => {
      ably.listeners.get("message")?.forEach((listener) => listener(inbound(3)));
    });
    expect(cachedIds(client)).toEqual([1, 3]);
    unmount();
  });
});
