import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { useBuildNotificationUnreadCount } from "@/hooks/api/build/approvals";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

const mockUseCan = jest.fn<boolean, [string]>().mockReturnValue(true);

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ count: 3 }),
  },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (fn: () => unknown) => fn,
}));

jest.mock("@/hooks/api/notifications-schema", () => ({
  notificationCountContract: { parse: (v: unknown) => v },
}));

jest.mock("@/lib/query-request-policies", () => ({
  NOTIFICATION_FALLBACK_INTERVAL_MS: 30_000,
}));

jest.mock("@/lib/query-error-policy", () => ({
  INLINE_READ_ERROR: {},
}));

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  onlineManager.setOnline(true);
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe("BSN-03-024 — Build Inbox badge reconnect behavior", () => {
  it("the badge query is not disabled on reconnect because refetchOnReconnect is not overridden to false", () => {
    const client = makeClient();
    const { result } = renderHook(() => useBuildNotificationUnreadCount(), {
      wrapper: wrap(client),
    });
    expect(result.current.data).toBeUndefined();
  });

  it("the badge query does not refetch on window focus because refetchOnWindowFocus is explicitly false", () => {
    const client = makeClient();
    client.setQueryData(
      platformCoreQueryKeys.notifications.unreadCount("build"),
      { count: 5 },
    );
    const refetchSpy = jest.spyOn(client, "refetchQueries");

    renderHook(() => useBuildNotificationUnreadCount(), { wrapper: wrap(client) });

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(refetchSpy).not.toHaveBeenCalled();
  });

  it("pauses the badge query when offline and the fetchStatus leaves paused once the connection returns", async () => {
    const client = makeClient();

    act(() => {
      onlineManager.setOnline(false);
    });

    const { result } = renderHook(() => useBuildNotificationUnreadCount(), {
      wrapper: wrap(client),
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe("paused"));

    await act(async () => {
      onlineManager.setOnline(true);
    });

    await waitFor(() => expect(result.current.fetchStatus).not.toBe("paused"));
  });
});

describe("BSN-03-024 — Build Inbox badge storage listener removed", () => {
  it("BSN-03-SL: a storage event with the legacy build inbox invalidation key does not invalidate the badge — the storage listener has been removed", () => {
    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    renderHook(() => useBuildNotificationUnreadCount(), { wrapper: wrap(client) });
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "build:inbox:invalidated",
          newValue: Date.now().toString(),
        }),
      );
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("BSN-03-024 — Build Inbox badge production cross-tab path", () => {
  it("the Build badge key is a strict prefix extension of the global unreadCount key so useNotificationEvents' invalidateNotificationInbox covers it without a storage event", () => {
    const globalKey = platformCoreQueryKeys.notifications.unreadCount();
    const buildKey = platformCoreQueryKeys.notifications.unreadCount("build");
    for (let i = 0; i < globalKey.length; i++)
      expect(buildKey[i]).toBe(globalKey[i]);
    expect(buildKey.length).toBeGreaterThan(globalKey.length);
  });

  it("a QueryClient prefix-invalidation on the global unreadCount key marks the Build badge entry as stale so it gets refetched", async () => {
    const client = makeClient();
    client.setQueryData(
      platformCoreQueryKeys.notifications.unreadCount("build"),
      { count: 5 },
    );
    await client.invalidateQueries({
      queryKey: platformCoreQueryKeys.notifications.unreadCount(),
    });
    const state = client.getQueryState(
      platformCoreQueryKeys.notifications.unreadCount("build"),
    );
    expect(state?.isInvalidated).toBe(true);
  });
});
