import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatRealtime } from "@/hooks/api/chat-realtime";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada" } },
    status: "authenticated",
  }),
}));
jest.mock("ably/react", () => ({ useAbly: jest.fn() }));
jest.mock("@/lib/ably", () => ({ reauthorizeAblyClients: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/features/chat/use-ably-connection", () => ({
  useAblyConnection: () => ({ isConnected: true, reconnectCount: 0 }),
}));

const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };

type PresenceListener = (member: { clientId: string; action: string; data: unknown }) => void;

function makeAbly() {
  let presenceListener: PresenceListener | null = null;
  const channel = {
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn(),
    publish: jest.fn().mockResolvedValue(undefined),
    presence: {
      subscribe: jest.fn((listener: PresenceListener) => {
        presenceListener = listener;
        return Promise.resolve();
      }),
      unsubscribe: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    },
  };
  return {
    channel,
    emitPresence: (member: Parameters<PresenceListener>[0]) => presenceListener?.(member),
    client: { channels: { get: jest.fn().mockReturnValue(channel) }, connection: { state: "connected", on: jest.fn(), off: jest.fn() } },
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("useChatRealtime typing over presence", () => {
  it("never publishes a typing message, and marks itself typing through presence", async () => {
    const ably = makeAbly();
    useAbly.mockReturnValue(ably.client);
    const { result } = renderHook(() => useChatRealtime(7), { wrapper });
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    act(() => result.current.publishTyping());
    expect(ably.channel.publish).not.toHaveBeenCalled();
    expect(ably.channel.presence.update).toHaveBeenCalledWith({ typing: true });
  });

  it("reports other members typing by their Ably clientId, ignoring data claims", async () => {
    const ably = makeAbly();
    useAbly.mockReturnValue(ably.client);
    const { result } = renderHook(() => useChatRealtime(7), { wrapper });
    await waitFor(() => expect(ably.channel.presence.subscribe).toHaveBeenCalled());
    act(() => ably.emitPresence({ clientId: "user-2", action: "update", data: { typing: true, userId: "user-9" } }));
    expect(result.current.typingUserIds).toEqual(["user-2"]);
    act(() => ably.emitPresence({ clientId: "user-1", action: "update", data: { typing: true } }));
    expect(result.current.typingUserIds).toEqual(["user-2"]);
    act(() => ably.emitPresence({ clientId: "user-2", action: "leave", data: null }));
    expect(result.current.typingUserIds).toEqual([]);
  });
});
