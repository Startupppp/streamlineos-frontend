import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUpsertCommentDraft } from "./comment-draft-commands";
import type { CommentDraft } from "./comment-draft-command-cache";
import { bufferDraft, peekBuffer } from "./comment-draft-offline-buffer";
import { OrgStorageScopeProvider } from "@/lib/org-scoped-storage";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

let mockOnline = true;
let mockImpersonating = false;
let mockAllowed = true;
let mockAccessReady = true;
let mockScope = "authenticated:org-a:user-a";
let mockSession: { status: string; data: { orgId?: string; sessionId?: string; user: { id: string } } | null };
const mockRefetch = jest.fn();

jest.mock("next-auth/react", () => ({ useSession: () => mockSession }));
jest.mock("@/hooks/common/use-online-status", () => ({ useOnlineStatus: () => mockOnline }));
jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockAllowed,
  useAccess: () => ({ data: mockAccessReady ? { isOrgOwner: mockAllowed, scopes: {} } : undefined, refetch: mockRefetch }),
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { put: jest.fn() }, isImpersonating: () => mockImpersonating }));
const put = jest.mocked(apiClient.put);
const scopeA = "authenticated:org-a:user-a";

function owner(userId = "user-a", orgId = "org-a", sessionId = "session-a") {
  return { status: "authenticated", data: { user: { id: userId }, orgId, sessionId } };
}
function draft(body = "private A"): CommentDraft {
  return { id: 1, ticketId: 7, orgId: "test-org", membershipId: null, body, createdAt: "2026-10-03T00:00:00.000Z", updatedAt: "2026-10-03T00:00:00.000Z" };
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <OrgStorageScopeProvider scope={mockScope}><QueryClientProvider client={client}>{children}</QueryClientProvider></OrgStorageScopeProvider>;
  }
  return { client, wrapper: Wrapper };
}
function deferred<T>() {
  let complete: (value: T) => void = () => { throw new Error("Uninitialized deferred"); };
  const promise = new Promise<T>((resolve) => { complete = resolve; });
  return { promise, complete };
}

beforeEach(() => {
  localStorage.clear();
  mockOnline = true;
  mockImpersonating = false;
  mockAllowed = true;
  mockAccessReady = true;
  mockScope = scopeA;
  mockSession = owner();
  mockRefetch.mockReset();
  mockRefetch.mockResolvedValue({ data: { isOrgOwner: true, scopes: {} } });
  put.mockReset();
  put.mockResolvedValue(draft());
});

it.each([
  owner("user-b", "org-a", "session-b"),
  owner("user-a", "org-b", "session-b"),
])("keeps an offline draft private across account or organization changes and recovers for its original owner", async (replacement) => {
  mockOnline = false;
  const first = renderHook(() => useUpsertCommentDraft(), setup());
  act(() => first.result.current.mutate({ ticketId: 7, body: "private A" }));
  expect(peekBuffer(scopeA)).toHaveLength(1);
  first.unmount();
  mockSession = replacement;
  mockScope = `authenticated:${replacement.data.orgId}:${replacement.data.user.id}`;
  mockOnline = true;
  const second = renderHook(() => useUpsertCommentDraft(), setup());
  await act(async () => { await Promise.resolve(); });
  expect(put).not.toHaveBeenCalled();
  expect(peekBuffer(scopeA)[0]?.body).toBe("private A");
  second.unmount();
  mockSession = owner();
  mockScope = scopeA;
  const original = renderHook(() => useUpsertCommentDraft(), setup());
  await waitFor(() => expect(peekBuffer(scopeA)).toEqual([]));
  expect(put).toHaveBeenCalledTimes(1);
  expect(put.mock.calls[0]?.[1]).toEqual({ body: "private A" });
  expect(put.mock.calls[0]?.[2]).toMatchObject({ expectedIdentity: { userId: "user-a", orgId: "org-a", sessionId: "session-a" }, signal: expect.any(AbortSignal) });
  original.unmount();
});

it.each([
  { status: "loading", data: owner().data },
  { status: "unauthenticated", data: null },
  { status: "authenticated", data: { user: { id: "user-a" } } },
])("refuses persistence and dispatch without a resolved organization session", async (session) => {
  mockSession = session;
  mockOnline = false;
  const hook = renderHook(() => useUpsertCommentDraft(), setup());
  act(() => hook.result.current.mutate({ ticketId: 7, body: "private A" }));
  expect(localStorage.length).toBe(0);
  mockOnline = true;
  hook.rerender();
  await act(async () => { await Promise.resolve(); });
  expect(put).not.toHaveBeenCalled();
});

it("refuses a mismatched trusted storage scope", async () => {
  mockScope = "authenticated:org-a:user-b";
  const hook = renderHook(() => useUpsertCommentDraft(), setup());
  act(() => hook.result.current.mutate({ ticketId: 7, body: "private A" }));
  await act(async () => { await Promise.resolve(); });
  expect(put).not.toHaveBeenCalled();
  expect(localStorage.length).toBe(0);
});

it.each(["denied", "outage"])("retains a pending draft after a failed replay and recovers on a later authorized mount", async (failure) => {
  bufferDraft(scopeA, 7, "private A");
  if (failure === "denied") mockAllowed = false;
  else put.mockRejectedValueOnce(new Error("Network unavailable"));
  const first = renderHook(() => useUpsertCommentDraft(), setup());
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  expect(peekBuffer(scopeA)[0]?.body).toBe("private A");
  if (failure === "denied") expect(put).not.toHaveBeenCalled();
  first.unmount();
  mockAllowed = true;
  const second = renderHook(() => useUpsertCommentDraft(), setup());
  await waitFor(() => expect(peekBuffer(scopeA)).toEqual([]));
  second.unmount();
});

it.each(["identity", "newer"])("fences a replay after awaiting permissions when %s changes", async (change) => {
  mockAccessReady = false;
  bufferDraft(scopeA, 7, "private A");
  const permission = deferred<{ data: { isOrgOwner: boolean; scopes: object } }>();
  mockRefetch.mockReturnValue(permission.promise);
  const hook = renderHook(() => useUpsertCommentDraft(), setup());
  await waitFor(() => expect(mockRefetch).toHaveBeenCalledTimes(1));
  if (change === "identity") {
    mockSession = owner("user-b", "org-a", "session-b");
    mockScope = "authenticated:org-a:user-b";
    hook.rerender();
  } else {
    put.mockResolvedValue(draft("newer A"));
    act(() => hook.result.current.mutate({ ticketId: 7, body: "newer A" }));
  }
  await act(async () => { permission.complete({ data: { isOrgOwner: true, scopes: {} } }); });
  if (change === "identity") {
    expect(put).not.toHaveBeenCalled();
    expect(peekBuffer(scopeA)[0]?.body).toBe("private A");
  } else {
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put.mock.calls[0]?.[1]).toEqual({ body: "newer A" });
  }
});

it("aborts an in-flight request and refuses its late acknowledgment or cache write after an identity transition", async () => {
  bufferDraft(scopeA, 7, "private A");
  const pending = deferred<CommentDraft>();
  put.mockReturnValue(pending.promise);
  const options = setup();
  const invalidate = jest.spyOn(options.client, "invalidateQueries");
  const hook = renderHook(() => useUpsertCommentDraft(), options);
  await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  const config = put.mock.calls[0]?.[2];
  mockSession = owner("user-b", "org-a", "session-b");
  mockScope = "authenticated:org-a:user-b";
  hook.rerender();
  expect(config && "signal" in config && config.signal?.aborted).toBe(true);
  await act(async () => { pending.complete(draft()); });
  expect(peekBuffer(scopeA)[0]?.body).toBe("private A");
  expect(invalidate).not.toHaveBeenCalled();
});

it("preserves a newer offline revision when an older save completes", async () => {
  bufferDraft(scopeA, 7, "private A");
  const pending = deferred<CommentDraft>();
  put.mockReturnValue(pending.promise);
  const hook = renderHook(() => useUpsertCommentDraft(), setup());
  await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  mockOnline = false;
  hook.rerender();
  act(() => hook.result.current.mutate({ ticketId: 7, body: "newer A" }));
  await act(async () => { pending.complete(draft()); });
  expect(peekBuffer(scopeA)[0]?.body).toBe("newer A");
});

it("deduplicates buffered replay across simultaneous mounts", async () => {
  bufferDraft(scopeA, 7, "private A");
  const pending = deferred<CommentDraft>();
  put.mockReturnValue(pending.promise);
  const first = renderHook(() => useUpsertCommentDraft(), setup());
  const second = renderHook(() => useUpsertCommentDraft(), setup());
  await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  await act(async () => { pending.complete(draft()); });
  await waitFor(() => expect(peekBuffer(scopeA)).toEqual([]));
  first.unmount();
  second.unmount();
});

it("blocks offline persistence and replay during impersonation", async () => {
  bufferDraft(scopeA, 7, "private A");
  mockImpersonating = true;
  const hook = renderHook(() => useUpsertCommentDraft(), setup());
  act(() => hook.result.current.mutate({ ticketId: 8, body: "other" }));
  await act(async () => { await Promise.resolve(); });
  expect(put).not.toHaveBeenCalled();
  expect(peekBuffer(scopeA)).toHaveLength(1);
});

it("aborts replay when impersonation is enabled and retains the pending entry", async () => {
  bufferDraft(scopeA, 7, "private A");
  const pending = deferred<CommentDraft>();
  put.mockReturnValue(pending.promise);
  const hook = renderHook(() => useUpsertCommentDraft(), setup());
  await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  const config = put.mock.calls[0]?.[2];
  act(() => { mockImpersonating = true; window.dispatchEvent(new Event("impersonation-change")); });
  expect(config && "signal" in config && config.signal?.aborted).toBe(true);
  await act(async () => { pending.complete(draft()); });
  expect(peekBuffer(scopeA)).toHaveLength(1);
  hook.unmount();
});

it("preserves legacy and corrupt buffers without automatic migration or overwriting", async () => {
  const key = scopeA + "::slos:comment-draft-pending:v2";
  localStorage.setItem("slos:comment-draft-pending", JSON.stringify({ 7: "legacy" }));
  localStorage.setItem(key, "unreadable bytes");
  mockOnline = false;
  const hook = renderHook(() => useUpsertCommentDraft(), setup());
  act(() => hook.result.current.mutate({ ticketId: 7, body: "private A" }));
  expect(localStorage.getItem(key)).toBe("unreadable bytes");
  mockOnline = true;
  hook.rerender();
  await act(async () => { await Promise.resolve(); });
  expect(put).not.toHaveBeenCalled();
  expect(localStorage.getItem("slos:comment-draft-pending")).toBe(JSON.stringify({ 7: "legacy" }));
});

it("keeps the successful normal autosave body minimal and acknowledges only its buffered revision", async () => {
  const options = setup();
  options.client.setQueryData(buildWorkQueryKeys.projects.commentDrafts.mine(), []);
  const hook = renderHook(() => useUpsertCommentDraft(), options);
  await act(async () => { await hook.result.current.mutateAsync({ ticketId: 7, body: "private A" }); });
  expect(put).toHaveBeenCalledTimes(1);
  expect(put.mock.calls[0]?.[1]).toEqual({ body: "private A" });
  expect(peekBuffer(scopeA)).toEqual([]);
});

it.each([false, true])("serializes an older replay before a newer online save across mounts=%s", async (acrossMounts) => {
  bufferDraft(scopeA, 7, "private A");
  const pending = deferred<CommentDraft>();
  let serverBody = "";
  put.mockImplementation(async (_path, body) => {
    if (typeof body !== "object" || body === null || !("body" in body) || typeof body.body !== "string") throw new Error("Invalid body");
    if (body.body === "private A") await pending.promise;
    serverBody = body.body;
    return draft(body.body);
  });
  const first = renderHook(() => useUpsertCommentDraft(), setup());
  await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  const second = acrossMounts ? renderHook(() => useUpsertCommentDraft(), setup()) : first;
  act(() => second.result.current.mutate({ ticketId: 7, body: "newer A" }));
  await act(async () => { await Promise.resolve(); });
  expect(put).toHaveBeenCalledTimes(1);
  await act(async () => { pending.complete(draft()); });
  await waitFor(() => expect(serverBody).toBe("newer A"));
  await waitFor(() => expect(peekBuffer(scopeA)).toEqual([]));
  expect(put).toHaveBeenCalledTimes(2);
  first.unmount();
  if (acrossMounts) second.unmount();
});

it("allows a mounted follower to take over after the replay owner unmounts", async () => {
  bufferDraft(scopeA, 7, "private A");
  const pending = deferred<CommentDraft>();
  put.mockReturnValueOnce(pending.promise);
  const first = renderHook(() => useUpsertCommentDraft(), setup());
  await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  const second = renderHook(() => useUpsertCommentDraft(), setup());
  first.unmount();
  await act(async () => { pending.complete(draft()); });
  await waitFor(() => expect(put).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(peekBuffer(scopeA)).toEqual([]));
  second.unmount();
});

it("cancels a queued save before dispatch when its mounted owner leaves", async () => {
  bufferDraft(scopeA, 7, "private A");
  const pending = deferred<CommentDraft>();
  put.mockReturnValueOnce(pending.promise);
  const first = renderHook(() => useUpsertCommentDraft(), setup());
  await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  const second = renderHook(() => useUpsertCommentDraft(), setup());
  act(() => second.result.current.mutate({ ticketId: 7, body: "newer A" }));
  second.unmount();
  await act(async () => { pending.complete(draft()); });
  expect(put).toHaveBeenCalledTimes(1);
  expect(peekBuffer(scopeA)[0]?.body).toBe("newer A");
  first.unmount();
});
