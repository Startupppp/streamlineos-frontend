import { request } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import type { Notification } from "@/types/notifications";
import { createNotificationToastHydration } from "../notification-toast-hydration";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();
jest.mock("@/lib/api-client", () => ({ request: jest.fn(), isImpersonating: () => false }));

const identity = { orgId: "org-1", userId: "user-1", sessionId: "session-1" };
const read = jest.mocked(request);

function row(id: number, patch: Partial<Notification> = {}): Notification {
  return { id, orgId: identity.orgId, userId: identity.userId, type: "INFO", priority: "NORMAL", category: "PROJECTS", sourceModule: "build", title: "Authorized assignment", message: "Authorized details", link: "/build/54/tickets/357", isRead: false, pinned: false, channel: "IN_APP", archivedAt: null, snoozedUntil: null, createdAt: "2026-10-03T00:00:00Z", ticketContext: null, ...patch };
}

function response(rows: Notification[]): Response {
  const body = { success: true, data: { data: rows, nextCursor: null, hasMore: false } };
  return { ok: true, status: 200, statusText: "OK", headers: new Headers({ "content-type": "application/json" }), body: null, bodyUsed: false, type: "basic", url: "http://api.test/notifications", redirected: false, json: async () => body, text: async () => JSON.stringify(body), arrayBuffer: async () => new ArrayBuffer(0), blob: async () => new Blob(), formData: async () => new FormData(), bytes: async () => new Uint8Array(), clone: () => response(rows) };
}

function setup(selectedIdentity = identity) {
  const controller = new AbortController();
  const onNotification = jest.fn<void, [Notification]>();
  const invalidate = jest.fn();
  let current = true;
  const queue = createNotificationToastHydration({ identity: selectedIdentity, signal: controller.signal, isCurrent: () => current, onNotification, invalidate });
  return { queue, controller, onNotification, invalidate, retire: () => { current = false; }, resume: () => { current = true; queue.wake(); } };
}

describe("authorized notification toast hydration", () => {
  beforeEach(() => { jest.useFakeTimers(); read.mockReset(); });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

  it("batches duplicate explicit IDs into one fresh authorized list read even when lists are not mounted", async () => {
    read.mockResolvedValue(response([row(2_147_483_648), row(7)]));
    const state = setup();
    state.queue.hint(7);
    state.queue.hint(2_147_483_648);
    state.queue.hint(7);
    expect(read).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(100);
    expect(read).toHaveBeenCalledTimes(1);
    expect(read.mock.calls[0]?.[0]).toContain("ids=7%2C2147483648");
    expect(read.mock.calls[0]?.[2]?.expectedIdentity).toEqual(identity);
    expect(state.onNotification.mock.calls.map(([notification]) => notification.id)).toEqual([7, 2_147_483_648]);
    expect(state.invalidate).toHaveBeenCalledTimes(1);
    state.queue.stop();
  });

  it("treats omitted private IDs as no toast and ignores unsolicited response rows", async () => {
    read.mockResolvedValue(response([row(99)]));
    const state = setup();
    state.queue.hint(7);
    await jest.advanceTimersByTimeAsync(100);
    expect(state.onNotification).not.toHaveBeenCalled();
    state.queue.hint(7);
    await jest.advanceTimersByTimeAsync(100);
    expect(read).toHaveBeenCalledTimes(1);
    state.queue.stop();
  });

  it("retries an attributed transport failure a bounded number of times and resumes only explicit held hints on reconnect", async () => {
    read.mockRejectedValue(new ApiError("Unavailable", undefined, "NETWORK_ERROR"));
    const state = setup();
    state.queue.hint(7);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(read).toHaveBeenCalledTimes(3);
    expect(state.onNotification).not.toHaveBeenCalled();
    read.mockResolvedValue(response([row(7)]));
    state.queue.reconnect();
    await jest.advanceTimersByTimeAsync(100);
    expect(read).toHaveBeenCalledTimes(4);
    expect(state.onNotification).toHaveBeenCalledTimes(1);
    state.queue.stop();
  });

  it("does not suppress an authorized notification after its snooze time has passed", async () => {
    read.mockResolvedValue(response([row(7, { snoozedUntil: "2020-01-01T00:00:00Z" })]));
    const state = setup();
    state.queue.hint(7);
    await jest.advanceTimersByTimeAsync(100);
    expect(state.onNotification).toHaveBeenCalledTimes(1);
    state.queue.stop();
  });

  it("does not toast initial history, count-only changes or reconnect without a hint", async () => {
    const state = setup();
    state.queue.changed(); state.queue.changed(); state.queue.reconnect();
    await jest.advanceTimersByTimeAsync(100);
    expect(read).not.toHaveBeenCalled();
    expect(state.onNotification).not.toHaveBeenCalled();
    expect(state.invalidate).toHaveBeenCalledTimes(1);
    state.queue.stop();
  });

  it.each([401, 403, 400])("does not retry authorization or query validation refusal %s", async (status) => {
    read.mockRejectedValue(new ApiError("Refused", status, "REFUSED"));
    const state = setup(); state.queue.hint(7);
    await jest.advanceTimersByTimeAsync(10_000);
    state.queue.reconnect();
    await jest.advanceTimersByTimeAsync(100);
    expect(read).toHaveBeenCalledTimes(1);
    expect(state.onNotification).not.toHaveBeenCalled();
    state.queue.stop();
  });

  it.each([{ orgId: "another-org" }, { userId: "another-user" }])("refuses mismatched response identity %j", async (patch) => {
    read.mockResolvedValue(response([row(7, patch)]));
    const state = setup(); state.queue.hint(7);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(state.onNotification).not.toHaveBeenCalled();
    expect(read).toHaveBeenCalledTimes(1);
    state.queue.stop();
  });

  it("refuses malformed response data without retry or cached content", async () => {
    const bad = response([row(7)]);
    bad.json = async () => ({ success: true, data: { data: [{ id: 7, title: "Forged" }], nextCursor: null, hasMore: false } });
    read.mockResolvedValue(bad);
    const state = setup(); state.queue.hint(7);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(state.onNotification).not.toHaveBeenCalled();
    expect(read).toHaveBeenCalledTimes(1);
    state.queue.stop();
  });

  it.each([{ isRead: true }, { archivedAt: "2026-10-03T00:00:00Z" }, { snoozedUntil: "2999-01-01T00:00:00Z" }, { priority: "LOW" } satisfies Partial<Notification>])("preserves attention and LOW priority suppression %j", async (patch) => {
    read.mockResolvedValue(response([row(7, patch)]));
    const state = setup(); state.queue.hint(7);
    await jest.advanceTimersByTimeAsync(100);
    expect(state.onNotification).not.toHaveBeenCalled();
    state.queue.stop();
  });

  it("accepts nullable recipient projection and out-of-order hints without a greatest-ID cutoff", async () => {
    read.mockResolvedValueOnce(response([row(100, { userId: null })])).mockResolvedValueOnce(response([row(7)]));
    const state = setup(); state.queue.hint(100);
    await jest.advanceTimersByTimeAsync(100);
    state.queue.hint(7); state.queue.hint(100);
    await jest.advanceTimersByTimeAsync(100);
    expect(state.onNotification.mock.calls.map(([notification]) => notification.id)).toEqual([100, 7]);
    state.queue.stop();
  });

  it("bounds delayed-request overflow to 1000 total explicit IDs and 100 per request", async () => {
    let resolveFirst: (value: Response) => void = () => { throw new Error("Request not started"); };
    read.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; })).mockResolvedValue(response([]));
    const state = setup(); state.queue.hint(1);
    await jest.advanceTimersByTimeAsync(100);
    for (let id = 2; id <= 1_100; id += 1) state.queue.hint(id);
    expect(read).toHaveBeenCalledTimes(1);
    resolveFirst(response([]));
    await jest.advanceTimersByTimeAsync(2_000);
    const batches = read.mock.calls.map(([url]) => new URL(url, "http://api.test").searchParams.get("ids")?.split(",") ?? []);
    expect(batches.every((ids) => ids.length <= 100)).toBe(true);
    expect(batches.flat()).toHaveLength(1_000);
    expect(batches.flat()).not.toContain("1001");
    expect(state.invalidate).toHaveBeenCalledTimes(2);
    state.queue.stop();
  });

  it("moves failed IDs behind new hints so a failed batch does not starve a later authorized toast", async () => {
    let rejectFirst: (error: Error) => void = () => { throw new Error("Request not started"); };
    read.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectFirst = reject; })).mockResolvedValue(response([row(101)]));
    const state = setup();
    for (let id = 1; id <= 100; id += 1) state.queue.hint(id);
    await jest.advanceTimersByTimeAsync(100);
    state.queue.hint(101);
    rejectFirst(new ApiError("Unavailable", 503));
    await jest.advanceTimersByTimeAsync(10_000);
    const ids = new URL(read.mock.calls[1]?.[0] ?? "", "http://api.test").searchParams.get("ids")?.split(",");
    expect(ids?.[0]).toBe("101");
    expect(state.onNotification.mock.calls.map(([notification]) => notification.id)).toEqual([101]);
    state.queue.stop();
  });

  it("uses a new fresh request for the same IDs after a same-user session switch", async () => {
    let resolveOld: (value: Response) => void = () => { throw new Error("Request not started"); };
    read.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce(response([row(7, { title: "New session authorized" })]));
    const old = setup(); old.queue.hint(7);
    await jest.advanceTimersByTimeAsync(100);
    old.retire(); old.queue.stop();
    const next = setup({ ...identity, sessionId: "session-2" }); next.queue.hint(7);
    await jest.advanceTimersByTimeAsync(100);
    resolveOld(response([row(7, { title: "Old session private" })]));
    await jest.advanceTimersByTimeAsync(100);
    expect(read).toHaveBeenCalledTimes(2);
    expect(read.mock.calls[1]?.[2]?.expectedIdentity?.sessionId).toBe("session-2");
    expect(old.onNotification).not.toHaveBeenCalled();
    expect(next.onNotification.mock.calls.map(([notification]) => notification.title)).toEqual(["New session authorized"]);
    next.queue.stop();
  });

  it("keeps a terminal response refusal terminal when it settles during a subscriber gap", async () => {
    let rejectRead: (error: Error) => void = () => { throw new Error("Read not started"); };
    read.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRead = reject; }));
    const state = setup(); state.queue.hint(7);
    await jest.advanceTimersByTimeAsync(100);
    state.retire(); rejectRead(new ApiError("Refused", 403, "REFUSED"));
    await jest.advanceTimersByTimeAsync(100);
    state.resume();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(read).toHaveBeenCalledTimes(1);
    expect(state.onNotification).not.toHaveBeenCalled();
    state.queue.stop();
  });

  it("preserves the transient attempt budget when a failed read settles during a subscriber gap", async () => {
    let rejectRead: (error: Error) => void = () => { throw new Error("Read not started"); };
    read.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRead = reject; })).mockRejectedValue(new ApiError("Unavailable", 503));
    const state = setup(); state.queue.hint(7);
    await jest.advanceTimersByTimeAsync(100);
    state.retire(); rejectRead(new ApiError("Unavailable", 503));
    await jest.advanceTimersByTimeAsync(100);
    state.resume();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(read).toHaveBeenCalledTimes(3);
    expect(state.onNotification).not.toHaveBeenCalled();
    state.queue.stop();
  });

  it.each(["retire", "stop", "abort"])("refuses a delayed response after %s", async (transition) => {
    let resolveRead: (value: Response) => void = () => { throw new Error("Request not started"); };
    read.mockImplementation(() => new Promise((resolve) => { resolveRead = resolve; }));
    const state = setup(); state.queue.hint(7);
    await jest.advanceTimersByTimeAsync(100);
    if (transition === "retire") state.retire();
    else if (transition === "stop") state.queue.stop();
    else state.controller.abort();
    resolveRead(response([row(7)]));
    await jest.advanceTimersByTimeAsync(100);
    expect(state.onNotification).not.toHaveBeenCalled();
    state.queue.stop();
  });
});
