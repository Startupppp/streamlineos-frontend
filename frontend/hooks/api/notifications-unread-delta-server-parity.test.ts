import { renderHook, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import {
  useArchiveNotification,
  useBulkDelete,
  useDeleteNotification,
  useMarkNotificationRead,
} from "./notifications-inbox";
import { queryKeys } from "@/lib/query-keys";
import type { Notification, UnreadCount } from "@/types/notifications";
import {
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

describe("optimistic unread delta matches queryUnreadCount's predicate — unread AND not archived AND not snoozed — because a row that predicate excluded was never in the badge", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    withInjectedClient(client);
  });

  it("still decrements for a plain unread row, so the zero-delta assertions below are not vacuous", async () => {
    seed(client, [makeNotif(1, false)], 5);
    const { result } = renderHook(() => useDeleteNotification(), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(badge(client)).toBe(4);
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

  it("still decrements for a row whose snooze has already elapsed, because the server counts it again", async () => {
    seed(client, [{ ...makeNotif(1, false), snoozedUntil: PAST }], 5);
    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: wrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(badge(client)).toBe(4);
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
});
