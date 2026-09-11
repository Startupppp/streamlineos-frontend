import { renderHook, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import {
  useBulkMarkRead,
  useBulkArchive,
  useBulkDelete,
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

describe("useBulkArchive — optimistic rollback", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    withInjectedClient(client);
  });

  it("optimistically sets archivedAt on targeted notifications", async () => {
    const flatKey = queryKeys.notifications.list({});
    client.setQueryData<Notification[]>(flatKey, [makeNotif(300, false), makeNotif(301, true)]);
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 1 });

    const { result } = renderHook(() => useBulkArchive(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync([300, 301]);
    });

    const after = client.getQueryData<Notification[]>(flatKey);
    expect(after?.[0]?.archivedAt).not.toBeNull();
    expect(after?.[1]?.archivedAt).not.toBeNull();
  });

  it("restores list and unread count on error", async () => {
    const flatKey = queryKeys.notifications.list({});
    client.setQueryData<Notification[]>(flatKey, [makeNotif(302, false), makeNotif(303, true)]);
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 1 });

    apiClientMock().post.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useBulkArchive(), { wrapper: wrapper(client) });

    await act(async () => {
      result.current.mutate([302, 303]);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restored = client.getQueryData<Notification[]>(flatKey);
    expect(restored?.[0]?.archivedAt).toBeNull();
    expect(restored?.[1]?.archivedAt).toBeNull();
    const restoredCount = client.getQueryData<UnreadCount>(queryKeys.notifications.unreadCount());
    expect(restoredCount?.count).toBe(1);
  });
});

describe("useBulkDelete — optimistic rollback", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    withInjectedClient(client);
  });

  it("optimistically removes targeted notifications from the list", async () => {
    const flatKey = queryKeys.notifications.list({});
    client.setQueryData<Notification[]>(flatKey, [makeNotif(400, false), makeNotif(401, true), makeNotif(402, false)]);
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 2 });

    const { result } = renderHook(() => useBulkDelete(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync([400, 401]);
    });

    const after = client.getQueryData<Notification[]>(flatKey);
    expect(after).toHaveLength(1);
    expect(after?.[0]?.id).toBe(402);
  });

  it("restores removed notifications and unread count on error", async () => {
    const flatKey = queryKeys.notifications.list({});
    client.setQueryData<Notification[]>(flatKey, [makeNotif(410, false), makeNotif(411, true)]);
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 1 });

    apiClientMock().post.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useBulkDelete(), { wrapper: wrapper(client) });

    await act(async () => {
      result.current.mutate([410, 411]);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restored = client.getQueryData<Notification[]>(flatKey);
    expect(restored).toHaveLength(2);
    expect(restored?.[0]?.id).toBe(410);
    expect(restored?.[1]?.id).toBe(411);
    const restoredCount = client.getQueryData<UnreadCount>(queryKeys.notifications.unreadCount());
    expect(restoredCount?.count).toBe(1);
  });
});
