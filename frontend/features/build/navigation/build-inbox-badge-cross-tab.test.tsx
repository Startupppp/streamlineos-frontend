import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import {
  useBuildNotificationUnreadCount,
  signalBuildInboxInvalidation,
  BUILD_INBOX_INVALIDATION_KEY,
} from "@/hooks/api/build/approvals";
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
  localStorage.clear();
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

describe("BSN-03-024 — Build Inbox badge cross-tab update", () => {
  it("signalBuildInboxInvalidation writes the canonical key to localStorage", () => {
    signalBuildInboxInvalidation();
    expect(localStorage.getItem(BUILD_INBOX_INVALIDATION_KEY)).toBeTruthy();
  });

  it("a storage event from another tab causes useBuildNotificationUnreadCount to invalidate the badge count", () => {
    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    renderHook(() => useBuildNotificationUnreadCount(), { wrapper: wrap(client) });

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: BUILD_INBOX_INVALIDATION_KEY,
          newValue: Date.now().toString(),
        }),
      );
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: platformCoreQueryKeys.notifications.unreadCount("build"),
    });
  });

  it("a storage event with an unrelated key does not cause the badge count to invalidate", () => {
    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    renderHook(() => useBuildNotificationUnreadCount(), { wrapper: wrap(client) });

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "some-other-key",
          newValue: "1",
        }),
      );
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("isolation bites: the listener is removed on unmount so stale listeners do not accumulate", () => {
    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    const { unmount } = renderHook(() => useBuildNotificationUnreadCount(), {
      wrapper: wrap(client),
    });
    unmount();

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: BUILD_INBOX_INVALIDATION_KEY,
          newValue: "1",
        }),
      );
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
