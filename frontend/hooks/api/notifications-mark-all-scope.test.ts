import { act, renderHook, waitFor } from "@testing-library/react";
import type { InfiniteData } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { Notification, UnreadCount } from "@/types/notifications";
import type { UnifiedInboxResponse } from "@/types/inbox";
import { useMarkAllNotificationsRead } from "./notifications-inbox";
import {
  apiClientMock, makeNotif, makeUnifiedNotif, makeUnifiedPage,
  makeInfiniteData, makeUnifiedInfiniteData, withInjectedClient, wrapper,
} from "./notifications-inbox-test-fixtures";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "u-1" } } }),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock("./notifications-shared", () => ({
  useNotificationInboxInvalidation: jest.fn(),
}));

const keys = platformCoreQueryKeys.notifications;
const listKey = keys.list({});
const infiniteKey = keys.list({ infinite: true });
const unifiedKey = platformCoreQueryKeys.inbox.unified({ infinite: true });

function setup() {
  const client = createAppQueryClient();
  const notifications: Notification[] = [
    { ...makeNotif(1), sourceModule: "build", category: "PROJECTS" },
    { ...makeNotif(2), sourceModule: "hr", category: "HRMS" },
  ];
  client.setQueryData(listKey, notifications);
  client.setQueryData(infiniteKey, makeInfiniteData([notifications]));
  client.setQueryData(keys.unreadCount(), { count: 8 });
  client.setQueryData(keys.unreadCount("build"), { count: 3 });
  client.setQueryData(unifiedKey, makeUnifiedInfiniteData([makeUnifiedPage([
    { ...makeUnifiedNotif(1), sourceModule: "build" },
    { ...makeUnifiedNotif(2), sourceModule: "hr" },
  ])]));
  withInjectedClient(client);
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  apiClientMock().patch.mockResolvedValue({ success: true });
});

it("sends a server scope and only patches matching notifications across both inbox caches", async () => {
  const client = setup();
  const { result } = renderHook(() => useMarkAllNotificationsRead("build"), { wrapper: wrapper(client) });
  await act(async () => { await result.current.mutateAsync(); });
  expect(apiClientMock().patch).toHaveBeenCalledWith(
    "/notifications/source/build/read-all", undefined, expect.objectContaining({ expectedIdentity: {
      orgId: "org-1", userId: "u-1", sessionId: "session-1",
    } }), expect.anything(),
  );
  expect(client.getQueryData<Notification[]>(listKey)?.map((row) => row.isRead)).toEqual([true, false]);
  expect(client.getQueryData<InfiniteData<UnifiedInboxResponse>>(unifiedKey)?.pages[0].items
    .map((row) => row.isRead)).toEqual([true, false]);
  expect(client.getQueryData<UnreadCount>(keys.unreadCount())).toEqual({ count: 8 });
  expect(client.getQueryData<UnreadCount>(keys.unreadCount("build"))).toEqual({ count: 3 });
  client.clear();
});

it("restores owned read fields in both inboxes and preserves counts when the scoped write fails", async () => {
  const client = setup();
  apiClientMock().patch.mockRejectedValueOnce(new Error("unavailable"));
  const { result } = renderHook(() => useMarkAllNotificationsRead("build"), { wrapper: wrapper(client) });
  await act(async () => {
    await expect(result.current.mutateAsync()).rejects.toThrow("unavailable");
  });
  expect(client.getQueryData<Notification[]>(listKey)?.map((row) => row.isRead)).toEqual([false, false]);
  expect(client.getQueryData<InfiniteData<UnifiedInboxResponse>>(unifiedKey)?.pages[0].items
    .map((row) => row.isRead)).toEqual([false, false]);
  expect(client.getQueryData<UnreadCount>(keys.unreadCount())).toEqual({ count: 8 });
  client.clear();
});

it("preserves the global mark-all route and cross-module behavior when no scope is bound", async () => {
  const client = setup();
  const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper: wrapper(client) });
  await act(async () => { await result.current.mutateAsync(); });
  expect(apiClientMock().patch).toHaveBeenCalledWith(
    "/notifications/read-all", undefined, expect.objectContaining({ expectedIdentity: {
      orgId: "org-1", userId: "u-1", sessionId: "session-1",
    } }), expect.anything(),
  );
  expect(client.getQueryData<Notification[]>(listKey)?.every((row) => row.isRead)).toBe(true);
  expect(client.getQueryData<UnreadCount>(keys.unreadCount())).toEqual({ count: 8 });
  expect(client.getQueryState(keys.unreadCount())?.isInvalidated).toBe(true);
  client.clear();
});

it("does not fall back to global mark-all when an older server rejects the scoped route", async () => {
  const client = setup();
  apiClientMock().patch.mockRejectedValueOnce({ status: 404, code: "NOT_FOUND" });
  const { result } = renderHook(() => useMarkAllNotificationsRead("build"), { wrapper: wrapper(client) });
  await act(async () => {
    await expect(result.current.mutateAsync()).rejects.toEqual({ status: 404, code: "NOT_FOUND" });
  });
  expect(apiClientMock().patch).toHaveBeenCalledTimes(1);
  expect(apiClientMock().patch).toHaveBeenCalledWith(
    "/notifications/source/build/read-all", undefined, expect.objectContaining({ expectedIdentity: {
      orgId: "org-1", userId: "u-1", sessionId: "session-1",
    } }), expect.anything(),
  );
  expect(client.getQueryData<Notification[]>(listKey)?.map((row) => row.isRead)).toEqual([false, false]);
  expect(client.getQueryData<UnreadCount>(keys.unreadCount())).toEqual({ count: 8 });
  client.clear();
});

it("preserves concurrent foreign-module reads and fresh fields when a pending Build write fails", async () => {
  const client = setup();
  let fail: (error: Error) => void = () => { throw new Error("request has not started"); };
  apiClientMock().patch.mockImplementationOnce(() => {
    const pending = Promise.withResolvers();
    fail = pending.reject;
    return pending.promise;
  });
  const { result } = renderHook(() => useMarkAllNotificationsRead("build"), { wrapper: wrapper(client) });
  act(() => { result.current.mutate(); });
  await waitFor(() => expect(apiClientMock().patch).toHaveBeenCalledTimes(1));
  act(() => {
    client.setQueryData<Notification[]>(listKey, (rows) => rows?.map((row) => ({ ...row, isRead: true, title: "Fresh title" })));
    client.setQueryData<InfiniteData<UnifiedInboxResponse>>(unifiedKey, (data) => data && ({
      ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map((item) => ({ ...item, isRead: true, subject: "Fresh subject" })) })),
    }));
    client.setQueryData(keys.unreadCount(), { count: 7 });
    client.setQueryData(infiniteKey, makeInfiniteData([[
      { ...makeNotif(4, true), sourceModule: "build" },
      { ...makeNotif(2, true), sourceModule: "hr" },
    ]]));
    fail(new Error("scoped failure"));
  });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(client.getQueryData<Notification[]>(listKey)?.map((row) => [row.isRead, row.title]))
    .toEqual([[true, "Fresh title"], [true, "Fresh title"]]);
  expect(client.getQueryData<InfiniteData<UnifiedInboxResponse>>(unifiedKey)?.pages[0].items.map((row) => [row.isRead, row.subject]))
    .toEqual([[true, "Fresh subject"], [true, "Fresh subject"]]);
  expect(client.getQueryData<UnreadCount>(keys.unreadCount())).toEqual({ count: 7 });
  expect(client.getQueryData<InfiniteData<Notification[]>>(infiniteKey)?.pages[0].map((row) => [row.id, row.isRead]))
    .toEqual([[4, true], [2, true]]);
  client.clear();
});
