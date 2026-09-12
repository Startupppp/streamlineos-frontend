import { renderHook, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import type { InfiniteData, QueryKey } from "@tanstack/react-query";
import {
  useArchiveNotification,
  useBulkDelete,
  useDeleteNotification,
} from "./notifications-inbox";
import { queryKeys } from "@/lib/query-keys";
import type { Notification, UnreadCount } from "@/types/notifications";
import type { UnifiedInboxResponse } from "@/types/inbox";
import {
  apiClientMock,
  makeNotif,
  makeUnifiedInfiniteData,
  makeUnifiedNotif,
  makeUnifiedPage,
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
  invalidateNotificationInbox: jest.fn(),
  useNotificationInboxInvalidation: jest.fn().mockReturnValue({
    invalidateInbox: jest.fn(),
    orgId: "org-1",
    queryClient: null,
  }),
}));

jest.mock("@/lib/query-request-policies", () => ({
  NOTIFICATION_FALLBACK_INTERVAL_MS: 30_000,
}));

const UNIFIED_KEY = queryKeys.inbox.unified({ limit: 25, infinite: true });
const FLAT_KEY = queryKeys.notifications.list({});

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function unifiedIds(client: QueryClient): number[] {
  const data = client.getQueryData<InfiniteData<UnifiedInboxResponse>>(UNIFIED_KEY);
  return (data?.pages ?? []).flatMap((page) =>
    page.items.filter((item) => item.kind === "notification").map((item) => item.id),
  );
}

async function settle(run: () => void): Promise<void> {
  await act(async () => {
    run();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

describe("notification writes keep the unified inbox feed in step", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    withInjectedClient(client);
    client.setQueryData<UnreadCount>(queryKeys.notifications.unreadCount(), { count: 2 });
  });

  it("useDeleteNotification removes the row from the unified feed", async () => {
    client.setQueryData<Notification[]>(FLAT_KEY, [makeNotif(300), makeNotif(301)]);
    client.setQueryData<InfiniteData<UnifiedInboxResponse>>(
      UNIFIED_KEY,
      makeUnifiedInfiniteData([
        makeUnifiedPage([makeUnifiedNotif(300), makeUnifiedNotif(301)]),
      ]),
    );

    const { result } = renderHook(() => useDeleteNotification(), {
      wrapper: wrapper(client),
    });
    await settle(() => result.current.mutate(300));

    expect(unifiedIds(client)).toEqual([301]);
  });

  it("useBulkDelete removes every deleted row from the unified feed", async () => {
    client.setQueryData<Notification[]>(FLAT_KEY, [
      makeNotif(310),
      makeNotif(311),
      makeNotif(312),
    ]);
    client.setQueryData<InfiniteData<UnifiedInboxResponse>>(
      UNIFIED_KEY,
      makeUnifiedInfiniteData([
        makeUnifiedPage([makeUnifiedNotif(310), makeUnifiedNotif(311)]),
        makeUnifiedPage([makeUnifiedNotif(312)]),
      ]),
    );

    const { result } = renderHook(() => useBulkDelete(), { wrapper: wrapper(client) });
    await settle(() => result.current.mutate([310, 312]));

    expect(unifiedIds(client)).toEqual([311]);
  });

  it("a failed delete restores the unified pages, not just the notification lists", async () => {
    client.setQueryData<Notification[]>(FLAT_KEY, [makeNotif(320)]);
    client.setQueryData<InfiniteData<UnifiedInboxResponse>>(
      UNIFIED_KEY,
      makeUnifiedInfiniteData([makeUnifiedPage([makeUnifiedNotif(320)])]),
    );
    apiClientMock().delete.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useDeleteNotification(), {
      wrapper: wrapper(client),
    });
    await settle(() => result.current.mutate(320));

    expect(unifiedIds(client)).toEqual([320]);
  });

  it("a failed archive restores the unified pages", async () => {
    client.setQueryData<Notification[]>(FLAT_KEY, [makeNotif(330)]);
    client.setQueryData<InfiniteData<UnifiedInboxResponse>>(
      UNIFIED_KEY,
      makeUnifiedInfiniteData([makeUnifiedPage([makeUnifiedNotif(330)])]),
    );
    apiClientMock().patch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useArchiveNotification(), {
      wrapper: wrapper(client),
    });
    await settle(() => result.current.mutate(330));

    expect(unifiedIds(client)).toEqual([330]);
  });

  it("cancels the unified inbox before patching it, so an in-flight page cannot land on top", async () => {
    const cancelled: QueryKey[] = [];
    const realCancel = client.cancelQueries.bind(client);
    client.cancelQueries = jest.fn((filters?: { queryKey?: QueryKey }) => {
      if (filters?.queryKey) cancelled.push(filters.queryKey);
      return realCancel(filters);
    }) as QueryClient["cancelQueries"];

    client.setQueryData<Notification[]>(FLAT_KEY, [makeNotif(340)]);

    const { result } = renderHook(() => useArchiveNotification(), {
      wrapper: wrapper(client),
    });
    await settle(() => result.current.mutate(340));

    expect(cancelled.map((key) => JSON.stringify(key))).toContain(
      JSON.stringify(queryKeys.inbox.all),
    );
  });
});
