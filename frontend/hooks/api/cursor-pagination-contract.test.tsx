import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Notification, NotificationListParams } from "@/types/notifications";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

function makeClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeNotification(id: number): Notification {
  return {
    id,
    orgId: "org-1",
    userId: "user-1",
    type: "GENERIC",
    title: `n-${id}`,
    message: null,
    entityType: null,
    entityId: null,
    actionUrl: null,
    isRead: false,
    readAt: null,
    createdAt: new Date(2026, 0, 1).toISOString(),
  } as unknown as Notification;
}

function cachedPages(
  client: QueryClient,
  params: Omit<NotificationListParams, "cursor">,
): Notification[][] {
  const cached = client.getQueryData<InfiniteData<Notification[]>>(
    queryKeys.notifications.list({ ...params, infinite: true }),
  );
  return cached?.pages ?? [];
}

function cursorsSeen(): Array<string | undefined> {
  return apiClient.get.mock.calls
    .filter((call) => call[0] === "/notifications")
    .map((call) => {
      const params = call[1] as Record<string, string> | undefined;
      return params?.["cursor"];
    });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("id-derived cursors survive a page whose ids disagree with its order", () => {
  const LIMIT = 3;

  it("continues from the lowest id on the page, not the last element", async () => {
    // A page ordered by (priority DESC, id DESC) puts id 41 last while 12 is the
    // true minimum. Continuing from 41 would re-serve 12..40 and skip nothing on
    // this page but duplicate on the next — continuing from 12 is the only
    // keyset-safe move under `id < cursor`.
    const firstPage = [makeNotification(90), makeNotification(12), makeNotification(41)];
    apiClient.get.mockImplementation((url: string, params?: Record<string, string>) => {
      if (url !== "/notifications") return Promise.resolve([]);
      if (params?.["cursor"] === undefined) return Promise.resolve(firstPage);
      return Promise.resolve([makeNotification(9)]);
    });

    const client = makeClient();
    const { useInfiniteNotifications } = await import("./notifications-inbox");
    const { result } = renderHook(() => useInfiniteNotifications({ limit: LIMIT }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(cachedPages(client, { limit: LIMIT })).toHaveLength(2));

    expect(cursorsSeen()).toEqual([undefined, "12"]);
  });

  it("accumulates every id exactly once across pages", async () => {
    const firstPage = [makeNotification(90), makeNotification(12), makeNotification(41)];
    const secondPage = [makeNotification(9), makeNotification(4), makeNotification(7)];
    apiClient.get.mockImplementation((url: string, params?: Record<string, string>) => {
      if (url !== "/notifications") return Promise.resolve([]);
      if (params?.["cursor"] === undefined) return Promise.resolve(firstPage);
      if (params?.["cursor"] === "12") return Promise.resolve(secondPage);
      return Promise.resolve([]);
    });

    const client = makeClient();
    const { useInfiniteNotifications } = await import("./notifications-inbox");
    const { result } = renderHook(() => useInfiniteNotifications({ limit: LIMIT }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(cachedPages(client, { limit: LIMIT })).toHaveLength(2));

    const ids = cachedPages(client, { limit: LIMIT }).flat().map((n) => n.id);
    expect(ids).toEqual([90, 12, 41, 9, 4, 7]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stops when the page is short, so a partial page never asks for a third", async () => {
    apiClient.get.mockImplementation((url: string) =>
      url === "/notifications"
        ? Promise.resolve([makeNotification(5)])
        : Promise.resolve([]),
    );

    const client = makeClient();
    const { useInfiniteNotifications } = await import("./notifications-inbox");
    const { result } = renderHook(() => useInfiniteNotifications({ limit: LIMIT }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe("a cursor survives the round trip into the request", () => {
  it("sends a falsy-but-real cursor rather than dropping it", async () => {
    // id 0 is falsy. A `if (pageParam)` guard silently omits it and the backend
    // replays page one forever.
    const firstPage = [makeNotification(2), makeNotification(1), makeNotification(0)];
    apiClient.get.mockImplementation((url: string, params?: Record<string, string>) => {
      if (url !== "/notifications") return Promise.resolve([]);
      if (params?.["cursor"] === undefined) return Promise.resolve(firstPage);
      return Promise.resolve([]);
    });

    const client = makeClient();
    const { useInfiniteNotifications } = await import("./notifications-inbox");
    const { result } = renderHook(() => useInfiniteNotifications({ limit: 3 }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(cachedPages(client, { limit: 3 })).toHaveLength(2));

    expect(cursorsSeen()).toEqual([undefined, "0"]);
  });
});

describe("changing a filter resets pagination", () => {
  it("gives an unread-only read its own key and its own first page", async () => {
    apiClient.get.mockImplementation((url: string, params?: Record<string, string>) => {
      if (url !== "/notifications") return Promise.resolve([]);
      return Promise.resolve(
        params?.["unreadOnly"] === "true"
          ? [makeNotification(70)]
          : [makeNotification(90), makeNotification(80), makeNotification(70)],
      );
    });

    const client = makeClient();
    const { useInfiniteNotifications } = await import("./notifications-inbox");
    const wrapper = makeWrapper(client);

    const all = renderHook(() => useInfiniteNotifications({ limit: 3 }), { wrapper });
    await waitFor(() => expect(all.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(all.result.current.hasNextPage).toBe(true));
    await act(async () => {
      await all.result.current.fetchNextPage();
    });
    await waitFor(() =>
      expect(cachedPages(client, { limit: 3 }).length).toBeGreaterThan(1),
    );

    const unread = renderHook(
      () => useInfiniteNotifications({ limit: 3, unreadOnly: true }),
      { wrapper },
    );
    await waitFor(() => expect(unread.result.current.isSuccess).toBe(true));

    expect(cachedPages(client, { limit: 3, unreadOnly: true })).toHaveLength(1);
    expect(cachedPages(client, { limit: 3 }).length).toBeGreaterThan(1);
  });

  it("keys the two filters apart so neither can read the other's pages", () => {
    const unfiltered = queryKeys.notifications.list({ limit: 3, infinite: true });
    const filtered = queryKeys.notifications.list({
      limit: 3,
      unreadOnly: true,
      infinite: true,
    });
    expect(JSON.stringify(unfiltered)).not.toBe(JSON.stringify(filtered));
  });
});
