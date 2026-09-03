import { renderHook, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import {
  useArchiveNotification,
  useUnarchiveNotification,
  useDeleteNotification,
  usePinNotification,
  useSnoozeNotification,
} from "./notifications-inbox";
import { queryKeys } from "@/lib/query-keys";
import type { Notification, UnreadCount } from "@/types/notifications";
import {
  apiClientMock,
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

    apiClientMock().patch.mockRejectedValueOnce(new Error("Network error"));

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

    apiClientMock().patch.mockRejectedValueOnce(new Error("Network error"));

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

    apiClientMock().delete.mockRejectedValueOnce(new Error("Network error"));

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

    apiClientMock().patch.mockRejectedValueOnce(new Error("Network error"));

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

    apiClientMock().patch.mockRejectedValueOnce(new Error("Network error"));

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

    apiClientMock().patch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useUnarchiveNotification(), { wrapper: wrapper(client) });

    await act(async () => {
      result.current.mutate(206);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restored = client.getQueryData<Notification[]>(flatKey);
    expect(restored?.[0]?.archivedAt).toBe(archivedAt);
  });
});
