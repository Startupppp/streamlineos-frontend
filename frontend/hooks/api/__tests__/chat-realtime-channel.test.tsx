import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useChatRealtime } from "@/hooks/api/chat-realtime";

/**
 * The chat window subscribes on the channel the token actually grants.
 *
 * Backend 5ac74c398 put every Ably channel behind `cell:<cellId>:`. This hook
 * kept asking for the pre-5ac74c398 name, which the minted token does not
 * authorise, so Ably refused the attach with a 403, `safeSubscribe` swallowed
 * it, and the hook still reported `isConnected: true` because the *connection*
 * (as opposed to the channel) was fine. The poll fallback in
 * use-message-panel-data.ts is gated on that flag, so it never engaged and the
 * window went permanently silent with no error anywhere.
 *
 * Both halves are asserted here: the name asked for, and the verdict reported
 * when the attach is refused.
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

interface MockChannel {
  subscribe: jest.Mock;
  unsubscribe: jest.Mock;
  publish: jest.Mock;
}

function makeAblyMock(options: { subscribeRejects?: boolean } = {}) {
  const requested: string[] = [];
  const channels = new Map<string, MockChannel>();

  const capabilityRefusal = Object.assign(
    new Error("Channel denied access based on given capability"),
    { statusCode: 403, code: 40160 },
  );

  function channelFor(name: string): MockChannel {
    const existing = channels.get(name);
    if (existing) return existing;
    const channel: MockChannel = {
      subscribe: jest
        .fn()
        .mockImplementation(() =>
          options.subscribeRejects
            ? Promise.reject(capabilityRefusal)
            : Promise.resolve(undefined),
        ),
      unsubscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(undefined),
    };
    channels.set(name, channel);
    return channel;
  }

  return {
    requested,
    channels: {
      get: jest.fn().mockImplementation((name: string) => {
        requested.push(name);
        return channelFor(name);
      }),
    },
    connection: {
      state: "connected",
      on: jest.fn(),
      off: jest.fn(),
    },
  };
}

function makeWrapper(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  Wrapper.displayName = "TestQueryWrapper";
  return Wrapper;
}

function freshClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useChatRealtime — channel name", () => {
  it("subscribes on the cell-prefixed channel the Ably token grants", async () => {
    const ably = makeAblyMock();
    useAbly.mockReturnValue(ably);

    const { unmount } = renderHook(() => useChatRealtime(7), {
      wrapper: makeWrapper(freshClient()),
    });

    await waitFor(() => {
      expect(ably.requested.length).toBeGreaterThan(0);
    });

    // ably.service.ts grants `cell:legacy-1:chat:${orgId}:${channelId}`.
    expect(ably.requested).toContain("cell:legacy-1:chat:org-1:7");
    expect(ably.requested).not.toContain("chat:org-1:7");

    unmount();
  });
});

describe("useChatRealtime — attach verdict drives the poll fallback", () => {
  it("reports isConnected false when the channel attach is refused", async () => {
    const ably = makeAblyMock({ subscribeRejects: true });
    useAbly.mockReturnValue(ably);

    const { result, unmount } = renderHook(() => useChatRealtime(7), {
      wrapper: makeWrapper(freshClient()),
    });

    // The socket is up — only the channel was refused.
    expect(ably.connection.state).toBe("connected");

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    unmount();
  });

  it("reports isConnected true once the channel attaches", async () => {
    const ably = makeAblyMock();
    useAbly.mockReturnValue(ably);

    const { result, unmount } = renderHook(() => useChatRealtime(7), {
      wrapper: makeWrapper(freshClient()),
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    unmount();
  });
});
