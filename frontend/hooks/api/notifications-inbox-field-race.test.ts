import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { isImpersonating } from "@/lib/api-client";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { authenticatedScope } from "@/lib/query-scope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { Notification, UnreadCount } from "@/types/notifications";
import type { InfiniteData } from "@tanstack/react-query";
import type { UnifiedInboxResponse } from "@/types/inbox";
import {
  useArchiveNotification, useBulkArchive, useBulkDelete, useMarkAllNotificationsRead,
  useMarkNotificationRead, usePinNotification, useSnoozeNotification,
  useUnpinNotification, useUnsnoozeNotification, useUnarchiveNotification,
} from "./notifications-inbox";
import {
  apiClientMock, makeNotif, makeInfiniteData, makeUnifiedInfiniteData,
  makeUnifiedNotif, makeUnifiedPage, setNotificationSession, wrapper,
} from "./notifications-inbox-test-fixtures";

jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));
jest.mock("@/lib/api-client", () => ({
  isImpersonating: jest.fn(() => false),
  apiClient: {
    patch: jest.fn(), post: jest.fn(), delete: jest.fn(), get: jest.fn(),
  },
}));

const keys = platformCoreQueryKeys.notifications;
const flat = keys.list({ section: "ALL" });
const infinite = keys.list({ infinite: true });
const unified = platformCoreQueryKeys.inbox.unified({ infinite: true });
let client: ReturnType<typeof createAppQueryClient>;

function rows() { return client.getQueryData<Notification[]>(flat) ?? []; }
function useRaceMutations() {
  return {
    read: useMarkNotificationRead(), archive: useArchiveNotification(),
    pin: usePinNotification(), snooze: useSnoozeNotification(),
    readAll: useMarkAllNotificationsRead(), bulkArchive: useBulkArchive(),
    bulkDelete: useBulkDelete(),
    unpin: useUnpinNotification(), unsnooze: useUnsnoozeNotification(), unarchive: useUnarchiveNotification(),
  };
}
function start(run: () => void) { act(run); }
async function called(count: number) {
  await waitFor(() => expect(apiClientMock().patch).toHaveBeenCalledTimes(count));
}
beforeEach(() => {
  jest.clearAllMocks(); setNotificationSession();
  jest.mocked(isImpersonating).mockReturnValue(false);
  client = createAppQueryClient(authenticatedScope("org-1", "u-1"));
  const initial = [{ ...makeNotif(1), sourceModule: "build" }, { ...makeNotif(2), sourceModule: "hr" }];
  client.setQueryData(flat, initial);
  client.setQueryData(infinite, makeInfiniteData([initial]));
  client.setQueryData(unified, makeUnifiedInfiniteData([makeUnifiedPage([
    { ...makeUnifiedNotif(1), sourceModule: "build" }, { ...makeUnifiedNotif(2), sourceModule: "hr" },
  ])]));
  client.setQueryData(keys.unreadCount(), { count: 8 });
  apiClientMock().patch.mockResolvedValue({ success: true });
  apiClientMock().post.mockResolvedValue({ success: true });
});
afterEach(() => { cleanup(); client.clear(); });

it("an older identical read failure cannot undo a later successful read", async () => {
  const pending = Promise.withResolvers<{ success: boolean }>();
  apiClientMock().patch.mockImplementationOnce(() => pending.promise);
  const { result } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  start(() => result.current.read.mutate(1)); await called(1);
  await act(async () => { await result.current.read.mutateAsync(1); });
  act(() => pending.reject(new Error("old failure")));
  await waitFor(() => expect(client.isMutating()).toBe(0));
  expect(rows()[0].isRead).toBe(true);
  expect(client.getQueryData<InfiniteData<UnifiedInboxResponse>>(unified)?.pages[0].items[0].isRead).toBe(true);
});

it("failed archive restores only its field after a successful pin and foreign-module read", async () => {
  const pending = Promise.withResolvers<{ success: boolean }>();
  apiClientMock().patch.mockImplementationOnce(() => pending.promise);
  const { result } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  start(() => result.current.archive.mutate(1)); await called(1);
  await act(async () => { await result.current.pin.mutateAsync(1); await result.current.read.mutateAsync(2); });
  act(() => pending.reject(new Error("archive failure")));
  await waitFor(() => expect(result.current.archive.isError).toBe(true));
  expect(rows().map((row) => [row.id, row.archivedAt, row.pinned, row.isRead])).toEqual([
    [1, null, true, false], [2, null, false, true],
  ]);
});

it("a refreshed authoritative row with the same optimistic value survives rollback", async () => {
  const pending = Promise.withResolvers<{ success: boolean }>();
  apiClientMock().patch.mockImplementationOnce(() => pending.promise);
  const { result } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  start(() => result.current.read.mutate(1)); await called(1);
  act(() => client.setQueryData(flat, [{ ...makeNotif(1, true), title: "Authoritative refreshed title" }, makeNotif(2, true)]));
  act(() => pending.reject(new Error("read failure")));
  await waitFor(() => expect(result.current.read.isError).toBe(true));
  expect(rows().map((row) => [row.isRead, row.title])).toEqual([
    [true, "Authoritative refreshed title"], [true, "Notification 2"],
  ]);
});

it("failed bulk deletion neither resurrects a removed row nor overwrites new triage", async () => {
  const pending = Promise.withResolvers<{ success: boolean }>();
  apiClientMock().post.mockImplementationOnce(() => pending.promise);
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const { result } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  start(() => result.current.bulkDelete.mutate([1]));
  await waitFor(() => expect(apiClientMock().post).toHaveBeenCalledTimes(1));
  await act(async () => { await result.current.read.mutateAsync(2); });
  act(() => { client.setQueryData(keys.unreadCount(), { count: 6 }); pending.reject(new Error("delete failure")); });
  await waitFor(() => expect(result.current.bulkDelete.isError).toBe(true));
  expect(rows().map((row) => [row.id, row.isRead])).toEqual([[2, true]]);
  expect(client.getQueryData<UnreadCount>(keys.unreadCount())).toEqual({ count: 6 });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.lists() });
});

it("older global-read failure preserves a newer same-field bulk read and fresh count", async () => {
  const pending = Promise.withResolvers<{ success: boolean }>();
  apiClientMock().patch.mockImplementationOnce(() => pending.promise);
  const { result } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  start(() => result.current.readAll.mutate()); await called(1);
  await act(async () => { await result.current.read.mutateAsync(1); });
  act(() => { client.setQueryData(keys.unreadCount(), { count: 3 }); pending.reject(new Error("global failure")); });
  await waitFor(() => expect(result.current.readAll.isError).toBe(true));
  expect(rows().map((row) => row.isRead)).toEqual([true, false]);
  expect(client.getQueryData<UnreadCount>(keys.unreadCount())).toEqual({ count: 3 });
});

it("older bulk archive failure preserves a newer same-field archive", async () => {
  const pending = Promise.withResolvers<{ success: boolean }>();
  apiClientMock().post.mockImplementationOnce(() => pending.promise);
  const { result } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  start(() => result.current.bulkArchive.mutate([1, 2]));
  await waitFor(() => expect(apiClientMock().post).toHaveBeenCalledTimes(1));
  await act(async () => { await result.current.archive.mutateAsync(1); });
  act(() => pending.reject(new Error("bulk archive failure")));
  await waitFor(() => expect(result.current.bulkArchive.isError).toBe(true));
  expect(rows()[0].archivedAt).not.toBeNull(); expect(rows()[1].archivedAt).toBeNull();
});

it.each([
  ["success", "session-2", "org-1", "u-1"], ["failure", "session-2", "org-1", "u-1"],
  ["success", "session-2", "org-2", "u-1"], ["failure", "session-2", "org-2", "u-1"],
  ["success", "session-2", "org-1", "u-2"], ["failure", "session-2", "org-1", "u-2"],
])("old-owner %s cannot write across %s/%s/%s", async (outcome, sessionId, orgId, userId) => {
  const pending = Promise.withResolvers<{ success: boolean }>();
  apiClientMock().patch.mockImplementationOnce(() => pending.promise);
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const { result, rerender } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  start(() => result.current.read.mutate(1)); await called(1);
  setNotificationSession(sessionId, orgId, userId); rerender();
  act(() => { client.setQueryData(flat, [makeNotif(1, false)]); client.setQueryData(keys.unreadCount(), { count: 19 }); });
  invalidate.mockClear();
  act(() => outcome === "success" ? pending.resolve({ success: true }) : pending.reject(new Error("old session")));
  await waitFor(() => expect(client.isMutating()).toBe(0));
  expect(rows()[0].isRead).toBe(false);
  expect(client.getQueryData<UnreadCount>(keys.unreadCount())).toEqual({ count: 19 });
  expect(invalidate).not.toHaveBeenCalled();
});

it("an ABA pin sequence keeps the newer identical success after the first failure", async () => {
  const pending = Promise.withResolvers<{ success: boolean }>();
  apiClientMock().patch.mockImplementationOnce(() => pending.promise);
  const { result } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  start(() => result.current.pin.mutate(1)); await called(1);
  await act(async () => { await result.current.unpin.mutateAsync(1); await result.current.pin.mutateAsync(1); });
  act(() => pending.reject(new Error("first pin failed")));
  await waitFor(() => expect(client.isMutating()).toBe(0));
  expect(rows()[0].pinned).toBe(true);
  expect(client.getQueryData<InfiniteData<Notification[]>>(infinite)?.pages[0][0].pinned).toBe(true);
});

it("two out-of-order failed identical reads restore the original field", async () => {
  const first = Promise.withResolvers<{ success: boolean }>();
  const second = Promise.withResolvers<{ success: boolean }>();
  apiClientMock().patch.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
  const { result } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  start(() => result.current.read.mutate(1)); await called(1);
  start(() => result.current.read.mutate(1)); await called(2);
  act(() => second.reject(new Error("newer read failed")));
  await waitFor(() => expect(client.isMutating()).toBe(1));
  expect(rows()[0].isRead).toBe(true);
  act(() => first.reject(new Error("older read failed")));
  await waitFor(() => expect(client.isMutating()).toBe(0));
  expect(rows()[0].isRead).toBe(false);
  expect(client.getQueryData<InfiniteData<UnifiedInboxResponse>>(unified)?.pages[0].items[0].isRead).toBe(false);
});

it("a same-value authoritative refresh is preserved even with structural sharing", async () => {
  const pending = Promise.withResolvers<{ success: boolean }>();
  apiClientMock().patch.mockImplementationOnce(() => pending.promise);
  const { result } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  start(() => result.current.read.mutate(1)); await called(1);
  const before = rows(); act(() => client.setQueryData(flat, before));
  expect(rows()).toBe(before);
  act(() => pending.reject(new Error("read failed after refresh")));
  await waitFor(() => expect(result.current.read.isError).toBe(true));
  expect(rows()[0].isRead).toBe(true);
});

it("explicit unsnooze preserves archive, sends no body and invalidates all scoped count variants", async () => {
  const future = "2099-12-31T00:00:00.000Z";
  const archivedAt = "2026-01-01T00:00:00.000Z";
  client.setQueryData(flat, [{ ...makeNotif(1), snoozedUntil: future, archivedAt }]);
  client.setQueryData(keys.unreadCount("build"), { count: 3 });
  const { result } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  await act(async () => { await result.current.unsnooze.mutateAsync(1); });
  expect(rows()[0]).toMatchObject({ snoozedUntil: null, archivedAt });
  expect(apiClientMock().patch).toHaveBeenCalledWith("/notifications/1/unsnooze", undefined,
    expect.objectContaining({ expectedIdentity: { orgId: "org-1", userId: "u-1", sessionId: "session-1" } }), expect.anything());
  expect(client.getQueryState(keys.unreadCount())?.isInvalidated).toBe(true);
  expect(client.getQueryState(keys.unreadCount("build"))?.isInvalidated).toBe(true);
});

it("failed unsnooze restores its own deadline while successful restore preserves it", async () => {
  const future = "2099-12-31T00:00:00.000Z";
  client.setQueryData(flat, [{ ...makeNotif(1), snoozedUntil: future, archivedAt: "2026-01-01T00:00:00.000Z" }]);
  const pending = Promise.withResolvers<{ success: boolean }>();
  apiClientMock().patch.mockImplementationOnce(() => pending.promise);
  const { result } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  start(() => result.current.unsnooze.mutate(1)); await called(1);
  await act(async () => { await result.current.unarchive.mutateAsync(1); });
  act(() => pending.reject(new Error("unsnooze failed")));
  await waitFor(() => expect(result.current.unsnooze.isError).toBe(true));
  expect(rows()[0]).toMatchObject({ snoozedUntil: future, archivedAt: null });
});

it("owner changes during query cancellation refuse dispatch and late caller callbacks", async () => {
  const pending = Promise.withResolvers<void>();
  jest.spyOn(client, "cancelQueries").mockImplementationOnce(() => pending.promise);
  const onSuccess = jest.fn(); const onError = jest.fn(); const onSettled = jest.fn();
  const { result, rerender } = renderHook(useRaceMutations, { wrapper: wrapper(client) });
  start(() => result.current.read.mutate(1, { onSuccess, onError, onSettled }));
  await waitFor(() => expect(client.cancelQueries).toHaveBeenCalled());
  setNotificationSession("session-2"); rerender(); act(() => pending.resolve());
  await waitFor(() => expect(result.current.read.isError).toBe(true));
  expect(apiClientMock().patch).not.toHaveBeenCalled(); expect(rows()[0].isRead).toBe(false);
  expect(onSuccess).not.toHaveBeenCalled(); expect(onError).not.toHaveBeenCalled(); expect(onSettled).not.toHaveBeenCalled();
});

it("incomplete session identity refuses both requests and optimistic patches", async () => {
  jest.mocked(useSession).mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1", role: "OrgMember" }, expires: "2099-01-01" },
    status: "authenticated", update: jest.fn(),
  });
  const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: wrapper(client) });
  await act(async () => { await expect(result.current.mutateAsync(1)).rejects.toMatchObject({ code: "REQUEST_IDENTITY_CHANGED" }); });
  expect(apiClientMock().patch).not.toHaveBeenCalled(); expect(rows()[0].isRead).toBe(false);
});

it("impersonation refuses an otherwise complete committed session", async () => {
  jest.mocked(isImpersonating).mockReturnValue(true);
  const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: wrapper(client) });
  await act(async () => { await expect(result.current.mutateAsync(1)).rejects.toMatchObject({ code: "REQUEST_IDENTITY_CHANGED" }); });
  expect(apiClientMock().patch).not.toHaveBeenCalled(); expect(rows()[0].isRead).toBe(false);
});

it.each([
  { initial: "build", next: undefined, path: "/notifications/source/build/read-all", reads: [true, false] },
  { initial: undefined, next: "build", path: "/notifications/read-all", reads: [true, true] },
])("mark-all captures $path before cancellation and a source rerender", async ({ initial, next, path, reads }) => {
  const cancellation = Promise.withResolvers<void>();
  jest.spyOn(client, "cancelQueries").mockImplementationOnce(() => cancellation.promise);
  const { result, rerender } = renderHook(
    ({ source }: { source: string | undefined }) => useMarkAllNotificationsRead(source),
    { initialProps: { source: initial }, wrapper: wrapper(client) },
  );
  start(() => result.current.mutate());
  await waitFor(() => expect(client.cancelQueries).toHaveBeenCalled());
  rerender({ source: next }); act(() => cancellation.resolve());
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(apiClientMock().patch).toHaveBeenCalledWith(path, undefined,
    expect.objectContaining({ expectedIdentity: { orgId: "org-1", userId: "u-1", sessionId: "session-1" } }), expect.anything());
  expect(rows().map((row) => row.isRead)).toEqual(reads);
});

it("sends the captured expected identity and aborts pending work on disposal", async () => {
  const pending = Promise.withResolvers<{ success: boolean }>();
  apiClientMock().patch.mockImplementationOnce(() => pending.promise);
  const { result, unmount } = renderHook(() => useMarkNotificationRead(), { wrapper: wrapper(client) });
  start(() => result.current.mutate(1)); await called(1);
  expect(apiClientMock().patch).toHaveBeenCalledWith("/notifications/1/read", undefined, {
    signal: expect.any(AbortSignal), expectedIdentity: { orgId: "org-1", userId: "u-1", sessionId: "session-1" },
  }, expect.anything());
  const config: unknown = apiClientMock().patch.mock.calls[0]?.[2];
  if (typeof config !== "object" || config === null || !("signal" in config) || !(config.signal instanceof AbortSignal))
    throw new Error("request missing abort signal");
  unmount(); expect(config.signal.aborted).toBe(true);
  act(() => pending.resolve({ success: true }));
});

it("disposed mutation callbacks refuse new requests and cache writes", async () => {
  const { result, unmount } = renderHook(() => useMarkNotificationRead(), { wrapper: wrapper(client) });
  const mutate = result.current.mutateAsync; unmount();
  await act(async () => { await expect(mutate(1)).rejects.toMatchObject({ code: "REQUEST_IDENTITY_CHANGED" }); });
  expect(apiClientMock().patch).not.toHaveBeenCalled(); expect(rows()[0].isRead).toBe(false);
});
