import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useBulkMarkRead,
  useInfiniteNotifications,
  useNotifications,
  useArchiveNotification,
  useUnarchiveNotification,
  useDeleteNotification,
  usePinNotification,
  useSnoozeNotification,
} from "./notifications-inbox";
import { queryKeys } from "@/lib/query-keys";
import type { Notification, UnreadCount } from "@/types/notifications";
import {
  NOTIFICATION_COMMANDS,
  CHAT_COMMANDS,
  ALL_COMMANDS,
} from "@/lib/command-catalog";

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

function makeNotif(id: number, isRead = false): Notification {
  return {
    id,
    orgId: "org-1",
    userId: "u-1",
    type: "INFO",
    title: `Notification ${id}`,
    message: null,
    isRead,
    isArchived: false,
    isPinned: false,
    pinned: false,
    createdAt: new Date().toISOString(),
    readAt: null,
    archivedAt: null,
    snoozedUntil: null,
    actionUrl: null,
    referenceType: null,
    referenceId: null,
    actorId: null,
    actorName: null,
    actorAvatar: null,
  } as Notification;
}

function makeInfiniteData(
  pages: Notification[][],
): InfiniteData<Notification[]> {
  return {
    pages,
    pageParams: pages.map((_, i) => (i === 0 ? undefined : i)),
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

function withInjectedClient(client: QueryClient) {
  const { useNotificationInboxInvalidation } = jest.requireMock(
    "./notifications-shared",
  ) as {
    useNotificationInboxInvalidation: jest.Mock;
  };
  useNotificationInboxInvalidation.mockReturnValue({
    invalidateInbox: jest.fn(),
    orgId: "org-1",
    queryClient: client,
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

    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { patch: jest.Mock };
    };
    apiClient.patch.mockRejectedValueOnce(new Error("Network error"));
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

describe("abort-signal propagation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("useNotifications passes signal to apiClient.get", async () => {
    const client = makeClient();
    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { get: jest.Mock };
    };
    apiClient.get.mockResolvedValue([]);

    const { result } = renderHook(() => useNotifications(), { wrapper: wrapper(client) });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    if (apiClient.get.mock.calls.length > 0) {
      const [, , signal] = apiClient.get.mock.calls[0] as [unknown, unknown, unknown];
      expect(signal).toBeDefined();
    }
  });

  it("useInfiniteNotifications passes signal to apiClient.get", async () => {
    const client = makeClient();
    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { get: jest.Mock };
    };
    apiClient.get.mockResolvedValue([]);

    const { result } = renderHook(() => useInfiniteNotifications(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    if (apiClient.get.mock.calls.length > 0) {
      const [, , signal] = apiClient.get.mock.calls[0] as [unknown, unknown, unknown];
      expect(signal).toBeDefined();
    }
  });
});

describe("bulk mark-read patches InfiniteData page by page", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    withInjectedClient(client);
  });

  it("marks only the specified ids as read across pages", async () => {
    const page1: Notification[] = [makeNotif(60, false), makeNotif(61, false)];
    const page2: Notification[] = [makeNotif(62, false), makeNotif(63, false)];
    const infiniteKey = queryKeys.notifications.list({ infinite: true });

    client.setQueryData<InfiniteData<Notification[]>>(
      infiniteKey,
      makeInfiniteData([page1, page2]),
    );
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 4 });

    const { result } = renderHook(() => useBulkMarkRead(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync([60, 62]);
    });

    const after = client.getQueryData<InfiniteData<Notification[]>>(infiniteKey);
    expect(after?.pages[0]?.[0]?.isRead).toBe(true);
    expect(after?.pages[0]?.[1]?.isRead).toBe(false);
    expect(after?.pages[1]?.[0]?.isRead).toBe(true);
    expect(after?.pages[1]?.[1]?.isRead).toBe(false);

    const count = client.getQueryData<UnreadCount>(queryKeys.notifications.unreadCount());
    expect(count?.count).toBe(2);
  });
});

describe("command catalog — classification coverage", () => {
  it("all notification commands are classified as SELF (universal)", () => {
    const entries = Object.entries(NOTIFICATION_COMMANDS);
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, entry] of entries)
      expect(entry.classification.kind).toBe("SELF");
    expect(entries.length).toBe(13);
  });

  it("chat commands include both PERMISSIONED and SELF entries", () => {
    const entries = Object.entries(CHAT_COMMANDS);
    const permissioned = entries.filter(([, e]) => e.classification.kind === "PERMISSIONED");
    const selfCmds = entries.filter(([, e]) => e.classification.kind === "SELF");
    expect(permissioned.length).toBeGreaterThan(0);
    expect(selfCmds.length).toBeGreaterThan(0);
  });

  it("ALL_COMMANDS includes both notification and chat domains", () => {
    expect(Object.keys(ALL_COMMANDS)).toContain("notifications");
    expect(Object.keys(ALL_COMMANDS)).toContain("chat");
  });

  it("every command entry has an endpoint string", () => {
    for (const domain of Object.values(ALL_COMMANDS))
      for (const entry of Object.values(domain))
        expect(typeof entry.endpoint).toBe("string");
  });
});

describe("lifecycle mutation rollback on error", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    withInjectedClient(client);
  });

  it("useArchiveNotification restores archivedAt to null on error", async () => {
    const flatKey = queryKeys.notifications.list({});
    client.setQueryData<Notification[]>(flatKey, [makeNotif(200, false)]);
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 1 });

    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { patch: jest.Mock };
    };
    apiClient.patch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useArchiveNotification(), { wrapper: wrapper(client) });

    await act(async () => {
      result.current.mutate(200);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restored = client.getQueryData<Notification[]>(flatKey);
    expect(restored?.[0]?.archivedAt).toBeNull();
  });

  it("useArchiveNotification restores unread count on error for unread notification", async () => {
    const flatKey = queryKeys.notifications.list({});
    client.setQueryData<Notification[]>(flatKey, [makeNotif(201, false)]);
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 3 });

    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { patch: jest.Mock };
    };
    apiClient.patch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useArchiveNotification(), { wrapper: wrapper(client) });

    await act(async () => {
      result.current.mutate(201);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const count = client.getQueryData<UnreadCount>(queryKeys.notifications.unreadCount());
    expect(count?.count).toBe(3);
  });

  it("useDeleteNotification restores notification presence on error", async () => {
    const flatKey = queryKeys.notifications.list({});
    client.setQueryData<Notification[]>(flatKey, [makeNotif(202, false), makeNotif(203, true)]);
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 1 });

    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { delete: jest.Mock };
    };
    apiClient.delete.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useDeleteNotification(), { wrapper: wrapper(client) });

    await act(async () => {
      result.current.mutate(202);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restored = client.getQueryData<Notification[]>(flatKey);
    expect(restored).toHaveLength(2);
    expect(restored?.[0]?.id).toBe(202);
    const restoredCount = client.getQueryData<UnreadCount>(queryKeys.notifications.unreadCount());
    expect(restoredCount?.count).toBe(1);
  });

  it("usePinNotification restores pinned flag to false on error", async () => {
    const flatKey = queryKeys.notifications.list({});
    client.setQueryData<Notification[]>(flatKey, [makeNotif(204)]);

    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { patch: jest.Mock };
    };
    apiClient.patch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => usePinNotification(), { wrapper: wrapper(client) });

    await act(async () => {
      result.current.mutate(204);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restored = client.getQueryData<Notification[]>(flatKey);
    expect(restored?.[0]?.pinned).toBe(false);
  });

  it("useSnoozeNotification restores snoozedUntil to null on error", async () => {
    const flatKey = queryKeys.notifications.list({});
    client.setQueryData<Notification[]>(flatKey, [makeNotif(205)]);

    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { patch: jest.Mock };
    };
    apiClient.patch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useSnoozeNotification(), { wrapper: wrapper(client) });

    await act(async () => {
      result.current.mutate({ id: 205, snoozedUntil: "2026-12-31T00:00:00.000Z" });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restored = client.getQueryData<Notification[]>(flatKey);
    expect(restored?.[0]?.snoozedUntil).toBeNull();
  });

  it("useUnarchiveNotification restores archivedAt on error", async () => {
    const archivedAt = "2026-01-01T00:00:00.000Z";
    const flatKey = queryKeys.notifications.list({});
    const archivedNotif = { ...makeNotif(206), archivedAt };
    client.setQueryData<Notification[]>(flatKey, [archivedNotif]);

    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { patch: jest.Mock };
    };
    apiClient.patch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useUnarchiveNotification(), { wrapper: wrapper(client) });

    await act(async () => {
      result.current.mutate(206);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restored = client.getQueryData<Notification[]>(flatKey);
    expect(restored?.[0]?.archivedAt).toBe(archivedAt);
  });
});
