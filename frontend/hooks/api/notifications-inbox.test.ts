import { renderHook, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "./notifications-inbox";
import { queryKeys } from "@/lib/query-keys";
import type { Notification, UnreadCount } from "@/types/notifications";
import {
  apiClientMock,
  makeInfiniteData,
  makeNotif,
  withInjectedClient,
  wrapper,
} from "./notifications-inbox-test-fixtures";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1" } },
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    patch: jest.fn().mockResolvedValue({ success: true }),
    post: jest.fn().mockResolvedValue({ success: true }),
    get: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock("./notifications-shared", () => ({
  SHARED_UNREAD_PARAMS: { section: "UNREAD", limit: 20 },
  toStringParams: (p: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(p)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)]),
    ),
  useNotificationInboxInvalidation: jest.fn().mockReturnValue({
    invalidateInbox: jest.fn(),
    orgId: "org-1",
    queryClient: null,
  }),
}));

jest.mock("@/lib/query-request-policies", () => ({
  NOTIFICATION_FALLBACK_INTERVAL_MS: 30_000,
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe("InfiniteData mark-read patch — no crash, correct unread counts", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    withInjectedClient(client);
  });

  it("patches InfiniteData pages correctly without crashing", async () => {
    const page1: Notification[] = [makeNotif(1, false), makeNotif(2, true)];
    const page2: Notification[] = [makeNotif(3, false), makeNotif(4, false)];
    const infiniteKey = queryKeys.notifications.list({ infinite: true });

    client.setQueryData<InfiniteData<Notification[]>>(infiniteKey, makeInfiniteData([page1, page2]));
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 3 });

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    const after = client.getQueryData<InfiniteData<Notification[]>>(infiniteKey);
    expect(after?.pages[0]?.[0]?.isRead).toBe(true);
    expect(after?.pages[0]?.[1]?.isRead).toBe(true);
    expect(after?.pages[1]?.[0]?.isRead).toBe(false);
    expect(after?.pages[1]?.[1]?.isRead).toBe(false);
  });

  it("updates unread count when patching InfiniteData pages", async () => {
    const page1: Notification[] = [makeNotif(10, false)];
    const page2: Notification[] = [makeNotif(11, false)];
    const infiniteKey = queryKeys.notifications.list({ infinite: true });

    client.setQueryData<InfiniteData<Notification[]>>(infiniteKey, makeInfiniteData([page1, page2]));
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 2 });

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(10);
    });

    const count = client.getQueryData<UnreadCount>(queryKeys.notifications.unreadCount());
    expect(count?.count).toBe(1);
  });

  it("marks all read across both InfiniteData pages and flat list simultaneously", async () => {
    const flatKey = queryKeys.notifications.list({ section: "ALL" });
    const infiniteKey = queryKeys.notifications.list({ infinite: true });

    const flatList: Notification[] = [makeNotif(20, false), makeNotif(21, false)];
    const infinitePage1: Notification[] = [makeNotif(22, false)];
    const infinitePage2: Notification[] = [makeNotif(23, false)];

    client.setQueryData<Notification[]>(flatKey, flatList);
    client.setQueryData<InfiniteData<Notification[]>>(
      infiniteKey,
      makeInfiniteData([infinitePage1, infinitePage2]),
    );
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 4 });

    const { result } = renderHook(() => useMarkAllNotificationsRead(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    const flatAfter = client.getQueryData<Notification[]>(flatKey);
    expect(flatAfter?.every((n) => n.isRead)).toBe(true);

    const infiniteAfter = client.getQueryData<InfiniteData<Notification[]>>(infiniteKey);
    const allInfiniteRead = infiniteAfter?.pages.flat().every((n) => n.isRead);
    expect(allInfiniteRead).toBe(true);

    const count = client.getQueryData<UnreadCount>(queryKeys.notifications.unreadCount());
    expect(count?.count).toBe(0);
  });
});

describe("rollback on mutation error", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    withInjectedClient(client);
    apiClientMock().patch.mockRejectedValueOnce(new Error("Network error"));
  });

  it("restores InfiniteData pages on error", async () => {
    const page1: Notification[] = [makeNotif(30, false)];
    const page2: Notification[] = [makeNotif(31, false)];
    const infiniteKey = queryKeys.notifications.list({ infinite: true });
    const original = makeInfiniteData([page1, page2]);

    client.setQueryData<InfiniteData<Notification[]>>(infiniteKey, original);
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 2 });

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutate(30);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restored = client.getQueryData<InfiniteData<Notification[]>>(infiniteKey);
    expect(restored?.pages[0]?.[0]?.isRead).toBe(false);
    expect(restored?.pages[1]?.[0]?.isRead).toBe(false);
  });

  it("restores unread count on error", async () => {
    const flatKey = queryKeys.notifications.list({});
    client.setQueryData<Notification[]>(flatKey, [makeNotif(40, false)]);
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 5 });

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutate(40);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const count = client.getQueryData<UnreadCount>(queryKeys.notifications.unreadCount());
    expect(count?.count).toBe(5);
  });
});

describe("concurrent realtime delivery vs optimistic state", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    withInjectedClient(client);
  });

  it("realtime update to a different notification does not clobber optimistic patch", async () => {
    const page1: Notification[] = [makeNotif(50, false), makeNotif(51, false)];
    const page2: Notification[] = [makeNotif(52, false)];
    const infiniteKey = queryKeys.notifications.list({ infinite: true });

    client.setQueryData<InfiniteData<Notification[]>>(infiniteKey, makeInfiniteData([page1, page2]));
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 3 });

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(50);
    });

    const afterOptimistic = client.getQueryData<InfiniteData<Notification[]>>(infiniteKey);
    expect(afterOptimistic?.pages[0]?.[0]?.isRead).toBe(true);

    const realtimeUpdate = makeNotif(52, true);
    client.setQueryData<InfiniteData<Notification[]>>(
      infiniteKey,
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((n) => (n.id === 52 ? realtimeUpdate : n)),
          ),
        };
      },
    );

    const afterRealtime = client.getQueryData<InfiniteData<Notification[]>>(infiniteKey);
    expect(afterRealtime?.pages[0]?.[0]?.isRead).toBe(true);
    expect(afterRealtime?.pages[1]?.[0]?.isRead).toBe(true);
  });
});
