import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import {
  useArchiveNotification,
  useBulkDelete,
  useDeleteNotification,
  useMarkNotificationRead,
  useUnreadNotificationCount,
} from "./notifications-inbox";
import { queryKeys } from "@/lib/query-keys";
import type { Notification, UnreadCount } from "@/types/notifications";
import {
  makeNotif,
  apiClientMock,
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

const FUTURE = "2099-01-01T00:00:00.000Z";
const PAST = "2000-01-01T00:00:00.000Z";

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function seed(client: QueryClient, rows: Notification[], count: number): void {
  client.setQueryData<Notification[]>(queryKeys.notifications.list(), rows);
  client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), {
    count,
  });
}

function badge(client: QueryClient): number | undefined {
  return client.getQueryData<UnreadCount>(
    queryKeys.notifications.unreadCount(),
  )?.count;
}

describe("mutation counts remain server-owned across incomplete cached read, archive and snooze states", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    withInjectedClient(client);
  });

  it("invalidates even a plain unread row rather than deriving its badge from a cached subset", async () => {
    seed(client, [makeNotif(1, false)], 5);
    const { result } = renderHook(() => useDeleteNotification(), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(badge(client)).toBe(5);
    expect(client.getQueryState(queryKeys.notifications.unreadCount())?.isInvalidated).toBe(true);
  });

  it("does not decrement when deleting an archived unread row the server already excluded", async () => {
    seed(
      client,
      [{ ...makeNotif(1, false), archivedAt: "2026-01-01T00:00:00.000Z" }],
      5,
    );
    const { result } = renderHook(() => useDeleteNotification(), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(badge(client)).toBe(5);
  });

  it("does not decrement when archiving a snoozed unread row the server already excluded", async () => {
    seed(client, [{ ...makeNotif(1, false), snoozedUntil: FUTURE }], 5);
    const { result } = renderHook(() => useArchiveNotification(), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(badge(client)).toBe(5);
  });

  it("does not decrement when marking a snoozed unread row read", async () => {
    seed(client, [{ ...makeNotif(1, false), snoozedUntil: FUTURE }], 5);
    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(badge(client)).toBe(5);
  });

  it("does not derive a count even when a cached snooze has elapsed", async () => {
    seed(client, [{ ...makeNotif(1, false), snoozedUntil: PAST }], 5);
    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(badge(client)).toBe(5);
  });

  it("does not drive the badge to zero when bulk-deleting archived unread rows", async () => {
    const archivedAt = "2026-01-01T00:00:00.000Z";
    seed(
      client,
      [
        { ...makeNotif(1, false), archivedAt },
        { ...makeNotif(2, false), archivedAt },
        { ...makeNotif(3, false), archivedAt },
      ],
      2,
    );
    const { result } = renderHook(() => useBulkDelete(), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync([1, 2, 3]);
    });
    expect(badge(client)).toBe(2);
  });

  it("refreshes an observed badge from the server even when cached rows cannot explain the change", async () => {
    seed(client, [makeNotif(1, false)], 8);
    apiClientMock().get.mockResolvedValue({ count: 2 });
    const { result } = renderHook(() => ({ read: useMarkNotificationRead(), count: useUnreadNotificationCount() }), {
      wrapper: wrapper(client),
    });
    expect(result.current.count.data?.count).toBe(8);
    expect(apiClientMock().get).not.toHaveBeenCalled();
    await act(async () => { await result.current.read.mutateAsync(1); });
    await waitFor(() => expect(result.current.count.data?.count).toBe(2));
    expect(badge(client)).toBe(2);
    expect(apiClientMock().get).toHaveBeenCalledTimes(1);
  });
});
