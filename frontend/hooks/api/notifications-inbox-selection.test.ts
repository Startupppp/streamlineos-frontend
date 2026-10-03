import { act, renderHook, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { apiClient, isImpersonating } from "@/lib/api-client";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { authenticatedScope } from "@/lib/query-scope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { ApiError } from "@/lib/api-envelope";
import { useInboxSelectedNotification } from "./notifications-inbox";
import { makeNotif, setNotificationSession, wrapper } from "./notifications-inbox-test-fixtures";

jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));
jest.mock("@/lib/api-client", () => ({ apiClient: { request: jest.fn(), get: jest.fn(), patch: jest.fn(), post: jest.fn(), delete: jest.fn() }, isImpersonating: jest.fn(() => false) }));
const requestMock = jest.mocked(apiClient.request);

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error("Not initialized"); };
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}
function page(id = 42) {
  return { data: [{ ...makeNotif(id), sourceModule: "build", ticketContext: null }], hasMore: false, nextCursor: null };
}
function response(payload: unknown = page()): Response {
  const body = { success: true, data: payload };
  return { ok: true, status: 200, statusText: "OK", headers: new Headers({ "content-type": "application/json" }), body: null, bodyUsed: false,
    type: "basic", url: "http://api.test/notifications", redirected: false, json: async () => body, text: async () => JSON.stringify(body),
    arrayBuffer: async () => new ArrayBuffer(0), blob: async () => new Blob(), formData: async () => new FormData(), bytes: async () => new Uint8Array(), clone: () => response(payload) };
}
beforeEach(() => { jest.clearAllMocks(); jest.mocked(isImpersonating).mockReturnValue(false); setNotificationSession(); });

describe("fresh Build Inbox selection", () => {
  it("rejects malformed response content through the canonical list contract", async () => {
    requestMock.mockResolvedValue(response({ ...page(), data: [{ ...page().data[0], title: 42 }] }));
    const { result } = renderHook(() => useInboxSelectedNotification(42, "ALL"), { wrapper: wrapper(createAppQueryClient(authenticatedScope("org-1", "u-1"))) });
    await waitFor(() => expect(result.current.error).toMatchObject({ code: "CONTRACT_VIOLATION" }));
    expect(result.current.notification).toBeNull();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
  it("starts a fresh read when the same identity becomes available after impersonation", async () => {
    requestMock.mockResolvedValue(response());
    const { result } = renderHook(() => useInboxSelectedNotification(42, "ALL"), { wrapper: wrapper(createAppQueryClient(authenticatedScope("org-1", "u-1"))) });
    await waitFor(() => expect(result.current.notification?.id).toBe(42));
    act(() => { jest.mocked(isImpersonating).mockReturnValue(true); window.dispatchEvent(new Event("impersonation-change")); });
    expect(result.current.notification).toBeNull();
    expect(requestMock).toHaveBeenCalledTimes(1);
    act(() => { jest.mocked(isImpersonating).mockReturnValue(false); window.dispatchEvent(new Event("impersonation-change")); });
    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.notification?.id).toBe(42));
  });
  it("never displays cached content before the current authorized read", async () => {
    const client = createAppQueryClient(authenticatedScope("org-1", "u-1"));
    client.setQueryData(platformCoreQueryKeys.notifications.list({ section: "ALL", sourceModule: "build", ids: [42], limit: 1 }), page().data);
    const pending = deferred<Response>();
    requestMock.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useInboxSelectedNotification(42, "ALL"), { wrapper: wrapper(client) });
    expect(result.current.notification).toBeNull();
    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(1));
    await act(async () => { pending.resolve(response()); });
    expect(result.current.notification?.id).toBe(42);
    expect(requestMock).toHaveBeenCalledWith("/notifications?section=ALL&sourceModule=build&ids=42&limit=1", { method: "GET" }, expect.objectContaining({ expectedIdentity: { orgId: "org-1", userId: "u-1", sessionId: "session-1" }, signal: expect.any(AbortSignal) }));
  });

  it("does not join or display an older same-user session request", async () => {
    const client = createAppQueryClient(authenticatedScope("org-1", "u-1"));
    const old = deferred<Response>();
    const current = deferred<Response>();
    requestMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const { result, rerender } = renderHook(() => useInboxSelectedNotification(42, "ALL"), { wrapper: wrapper(client) });
    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(1));
    setNotificationSession("session-2"); rerender();
    expect(result.current.notification).toBeNull();
    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(2));
    await act(async () => { old.resolve(response()); });
    expect(result.current.notification).toBeNull();
    await act(async () => { current.resolve(response({ ...page(), data: [{ ...page().data[0], title: "Authorized new session" }] })); });
    expect(result.current.notification?.title).toBe("Authorized new session");
    expect(requestMock.mock.calls[1]?.[2]?.expectedIdentity?.sessionId).toBe("session-2");
  });

  it.each([403, 404])("redacts a denied selection (%s) without a retry loop", async (status) => {
    requestMock.mockRejectedValue(new ApiError("Denied", status, "FORBIDDEN"));
    const { result } = renderHook(() => useInboxSelectedNotification(42, "ALL"), { wrapper: wrapper(createAppQueryClient(authenticatedScope("org-1", "u-1"))) });
    await waitFor(() => expect(result.current.isMissing).toBe(true));
    expect(result.current.notification).toBeNull();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it.each([{ sourceModule: "crm" }, { orgId: "org-other" }, { userId: "user-other" }])("fails closed for unrelated row ownership %s", async (fields) => {
    requestMock.mockResolvedValue(response({ ...page(), data: [{ ...page().data[0], ...fields }] }));
    const { result } = renderHook(() => useInboxSelectedNotification(42, "ALL"), { wrapper: wrapper(createAppQueryClient(authenticatedScope("org-1", "u-1"))) });
    await waitFor(() => expect(result.current.isMissing).toBe(true));
    expect(result.current.notification).toBeNull();
  });
  it("rechecks object authorization on list invalidation without trusting the former response", async () => {
    const client = createAppQueryClient(authenticatedScope("org-1", "u-1"));
    const key = platformCoreQueryKeys.notifications.list({ section: "UNREAD", sourceModule: "build" });
    client.setQueryData(key, page().data);
    requestMock.mockResolvedValueOnce(response()).mockResolvedValueOnce(response({ data: [], hasMore: false, nextCursor: null }));
    const { result } = renderHook(() => useInboxSelectedNotification(42, "ALL"), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.notification?.id).toBe(42));
    await act(async () => { await client.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.lists() }); });
    await waitFor(() => expect(result.current.isMissing).toBe(true));
    expect(result.current.notification).toBeNull();
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it("exposes retry without prior title after a transient failure", async () => {
    requestMock.mockRejectedValueOnce(new ApiError("Unavailable", 503)).mockResolvedValueOnce(response());
    const { result } = renderHook(() => useInboxSelectedNotification(42, "ALL"), { wrapper: wrapper(createAppQueryClient(authenticatedScope("org-1", "u-1"))) });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.notification).toBeNull();
    act(() => { result.current.retry(); });
    await waitFor(() => expect(result.current.notification?.id).toBe(42));
  });

  it("does not request an absent ID or unauthenticated identity", async () => {
    jest.mocked(useSession).mockReturnValue({ data: null, status: "unauthenticated", update: jest.fn() });
    const { result } = renderHook(() => useInboxSelectedNotification(null, "ALL"), { wrapper: wrapper(createAppQueryClient(authenticatedScope("org-1", "u-1"))) });
    expect(result.current.notification).toBeNull();
    expect(requestMock).not.toHaveBeenCalled();
  });
  it("discards a late result after disposal", async () => {
    const pending = deferred<Response>();
    requestMock.mockReturnValue(pending.promise);
    const { unmount } = renderHook(() => useInboxSelectedNotification(42, "ALL"), { wrapper: wrapper(createAppQueryClient(authenticatedScope("org-1", "u-1"))) });
    await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(1));
    const config: unknown = requestMock.mock.calls[0]?.[2];
    unmount();
    if (!config || typeof config !== "object" || !("signal" in config) || !(config.signal instanceof AbortSignal)) throw new Error("Missing request signal");
    expect(config.signal.aborted).toBe(true);
    await act(async () => { pending.resolve(response()); });
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});
