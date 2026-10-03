import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, type ReactNode } from "react";
import type { ApiResponseLike } from "@/lib/api-envelope";
import { useUpsertCommentDraft, useDeleteCommentDraftByTicket, type CommentDraft } from "../comment-drafts";
import { acknowledgeDraftIntent, peekDraftIntents, stageDraftIntent } from "../comment-draft-offline-buffer";
import { OrgStorageScopeProvider } from "@/lib/org-scoped-storage";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useTicketCommentComposer } from "@/features/build/ticket-details/use-ticket-comment-composer";

let mockOnline = true;
let mockAllowed = true;
let mockAccessReady = true;
let mockImpersonating = false;
let mockScope = "authenticated:org-a:user-a";
let mockSession = { status: "authenticated", data: { user: { id: "user-a" }, orgId: "org-a", sessionId: "session-a" } };
const mockRead = jest.fn<Promise<ApiResponseLike>, unknown[]>();
const mockPut = jest.fn<Promise<CommentDraft>, unknown[]>();
const mockDelete = jest.fn<Promise<{ deleted: boolean }>, unknown[]>();
const mockPermission = jest.fn();
const mockDirty = jest.fn();

jest.mock("next-auth/react", () => ({ useSession: () => mockSession }));
jest.mock("@/hooks/common/use-online-status", () => ({ useOnlineStatus: () => mockOnline }));
jest.mock("@/components/shared/dirty-state-context", () => ({ useRegisterDirtyState: (dirty: boolean) => mockDirty(dirty) }));
jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockAllowed,
  useAccess: () => ({ data: mockAccessReady ? { isOrgOwner: mockAllowed, scopes: {} } : undefined, refetch: mockPermission }),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { request: (...args: unknown[]) => mockRead(...args), put: (...args: unknown[]) => mockPut(...args), delete: (...args: unknown[]) => mockDelete(...args) },
  isImpersonating: () => mockImpersonating,
}));

const actor = "authenticated:org-a:user-a";
const key = (version: number) => `${actor}::slos:comment-draft-pending:v${version}`;
function draft(body = "server body"): CommentDraft {
  return { id: 1, ticketId: 7, body, createdAt: "2026-10-03T00:00:00.000Z", updatedAt: "2026-10-03T00:00:00.000Z" };
}
function deferred<T>() {
  let complete: (value: T) => void = () => { throw new Error("Uninitialized deferred"); };
  const promise = new Promise<T>((resolve) => { complete = resolve; });
  return { promise, complete };
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <OrgStorageScopeProvider scope={mockScope}><QueryClientProvider client={client}>{children}</QueryClientProvider></OrgStorageScopeProvider>;
  }
  return { client, wrapper: Wrapper };
}
beforeEach(() => {
  localStorage.clear();
  mockOnline = true; mockAllowed = true; mockAccessReady = true; mockImpersonating = false; mockScope = actor;
  mockSession = { status: "authenticated", data: { user: { id: "user-a" }, orgId: "org-a", sessionId: "session-a" } };
  mockRead.mockReset().mockResolvedValue({ ok: true, status: 200, statusText: "OK", json: async () => ({ success: true, data: null }) });
  mockPut.mockReset().mockImplementation(async (_path, input) => {
    if (typeof input !== "object" || input === null || !("body" in input) || typeof input.body !== "string") throw new Error("Invalid body");
    return draft(input.body);
  });
  mockDelete.mockReset().mockResolvedValue({ deleted: true });
  mockPermission.mockReset().mockResolvedValue({ data: { isOrgOwner: true, scopes: {} } });
  mockDirty.mockReset();
});

it("stages text before debounce and recovers it after leaving before 1200ms without hydration PUT", async () => {
  mockOnline = false;
  const first = renderHook(() => useTicketCommentComposer(7, true), setup());
  act(() => first.result.current.change("recover immediately"));
  expect(peekDraftIntents(actor)[0]).toMatchObject({ kind: "upsert", body: "recover immediately" });
  expect(mockPut).not.toHaveBeenCalled();
  expect(mockDirty).toHaveBeenLastCalledWith(false);
  first.unmount();
  const second = renderHook(() => useTicketCommentComposer(7, true), setup());
  expect(second.result.current.body).toBe("recover immediately");
  expect(second.result.current.persistenceStatus).toContain("waiting to sync");
  await act(async () => { await Promise.resolve(); });
  expect(mockPut).not.toHaveBeenCalled();
});

it("flushes the exact staged revision and refuses an obsolete timer handle", async () => {
  const hook = renderHook(() => useUpsertCommentDraft(), setup());
  const first = hook.result.current.stageEdit({ ticketId: 7, body: "first" });
  const newer = hook.result.current.stageEdit({ ticketId: 7, body: "newer" });
  await expect(hook.result.current.flushStaged(first)).rejects.toMatchObject({ code: "DRAFT_SUPERSEDED" });
  await act(async () => { await hook.result.current.flushStaged(newer); });
  expect(mockPut.mock.calls[0]?.[1]).toEqual({ body: "newer" });
  expect(mockPut).toHaveBeenCalledTimes(1);
  expect(peekDraftIntents(actor)).toEqual([]);
});

it("waits for an older PUT before deletion and never aborts it solely because clear was requested", async () => {
  const pending = deferred<CommentDraft>();
  let serverBody: string | null = null;
  mockPut.mockImplementation(async () => { await pending.promise; serverBody = "older"; return draft("older"); });
  mockDelete.mockImplementation(async () => { serverBody = null; return { deleted: true }; });
  const options = setup();
  const save = renderHook(() => useUpsertCommentDraft(), options);
  const remove = renderHook(() => useDeleteCommentDraftByTicket(), options);
  act(() => save.result.current.mutate({ ticketId: 7, body: "older" }));
  await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
  act(() => remove.result.current.mutate(7));
  expect(peekDraftIntents(actor)[0]?.kind).toBe("delete");
  expect(mockDelete).not.toHaveBeenCalled();
  const config = mockPut.mock.calls[0]?.[2];
  expect(config && typeof config === "object" && "signal" in config && config.signal instanceof AbortSignal && config.signal.aborted).toBe(false);
  await act(async () => { pending.complete(draft("older")); });
  await waitFor(() => expect(remove.result.current.isSuccess).toBe(true));
  expect(serverBody).toBeNull();
  expect(peekDraftIntents(actor)).toEqual([]);
});

it("hydrates a pending deletion as empty and replays DELETE rather than resurrecting a server draft", async () => {
  mockOnline = false;
  stageDraftIntent(actor, 7, "   ");
  mockRead.mockResolvedValue({ ok: true, status: 200, statusText: "OK", json: async () => ({ success: true, data: { ...draft(), orgId: "org-a", membershipId: 11 } }) });
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  expect(hook.result.current.body).toBe("");
  expect(mockPut).not.toHaveBeenCalled();
  mockOnline = true;
  hook.rerender();
  await waitFor(() => expect(peekDraftIntents(actor)).toEqual([]));
  expect(mockDelete.mock.calls[0]?.[0]).toBe("/build/comment-drafts/by-ticket/7");
  expect(mockPut).not.toHaveBeenCalled();
});

it("refuses a superseded deletion after permission resolution so new typing wins", async () => {
  mockAccessReady = false;
  const permission = deferred<{ data: { isOrgOwner: boolean; scopes: object } }>();
  mockPermission.mockReturnValue(permission.promise);
  const options = setup();
  const remove = renderHook(() => useDeleteCommentDraftByTicket(), options);
  const save = renderHook(() => useUpsertCommentDraft(), options);
  act(() => remove.result.current.mutate(7));
  await waitFor(() => expect(mockPermission).toHaveBeenCalledTimes(1));
  act(() => save.result.current.mutate({ ticketId: 7, body: "new typing" }));
  await act(async () => { permission.complete({ data: { isOrgOwner: true, scopes: {} } }); });
  await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockPut.mock.calls[0]?.[1]).toEqual({ body: "new typing" });
});

it("orders newer typing after an already dispatched DELETE across mounts", async () => {
  const pending = deferred<{ deleted: boolean }>();
  let serverBody: string | null = "old";
  mockDelete.mockImplementation(async () => { await pending.promise; serverBody = null; return { deleted: true }; });
  mockPut.mockImplementation(async () => { serverBody = "new typing"; return draft(serverBody); });
  const options = setup();
  const remove = renderHook(() => useDeleteCommentDraftByTicket(), options);
  const save = renderHook(() => useUpsertCommentDraft(), options);
  act(() => remove.result.current.mutate(7));
  await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
  act(() => save.result.current.mutate({ ticketId: 7, body: "new typing" }));
  expect(mockPut).not.toHaveBeenCalled();
  await act(async () => { pending.complete({ deleted: true }); });
  await waitFor(() => expect(serverBody).toBe("new typing"));
  expect(peekDraftIntents(actor)).toEqual([]);
});

it.each(["denied", "network"])("preserves a failed %s deletion and retries on a later authorized mount", async (failure) => {
  if (failure === "denied") mockAllowed = false;
  else mockDelete.mockRejectedValueOnce(new Error("Unavailable"));
  const first = renderHook(() => useDeleteCommentDraftByTicket(), setup());
  act(() => first.result.current.mutate(7));
  await waitFor(() => expect(first.result.current.isError).toBe(true));
  expect(peekDraftIntents(actor)[0]?.kind).toBe("delete");
  first.unmount(); mockAllowed = true;
  renderHook(() => useUpsertCommentDraft(), setup());
  await waitFor(() => expect(peekDraftIntents(actor)).toEqual([]));
});

it.each(["text", "blank"])("retains %s and dirty state when device storage fails then clears dirty on successful retry", async (kind) => {
  mockOnline = false;
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  const storage = jest.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("Quota exceeded"); });
  const body = kind === "text" ? "volatile text" : "";
  act(() => hook.result.current.change(body));
  expect(hook.result.current.body).toBe(body);
  expect(hook.result.current.persistenceError).toMatchObject({ code: "DRAFT_STORAGE_UNAVAILABLE" });
  expect(mockDirty).toHaveBeenLastCalledWith(true);
  storage.mockRestore();
  await act(async () => { await hook.result.current.retryPersistence(); });
  expect(mockDirty).toHaveBeenLastCalledWith(false);
  expect(hook.result.current.persistenceError).toBeNull();
  expect(peekDraftIntents(actor)[0]?.kind).toBe(kind === "text" ? "upsert" : "delete");
});

it.each([2, 3])("preserves corrupt version %s bytes and never claims the latest text was saved", (version) => {
  const raw = "{unreadable";
  localStorage.setItem(key(version), raw);
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  act(() => hook.result.current.change("retain my text"));
  expect(hook.result.current.body).toBe("retain my text");
  expect(mockDirty).toHaveBeenLastCalledWith(true);
  expect(localStorage.getItem(key(version))).toBe(raw);
  expect(mockPut).not.toHaveBeenCalled();
});

it("keeps a migrated v2 buffer intact but persists an empty v3 marker so it never resurrects", () => {
  const raw = JSON.stringify({ version: 2, scope: actor, entries: [{ ticketId: 7, body: "historical", revision: "00000000-0000-4000-8000-000000000001" }] });
  localStorage.setItem(key(2), raw);
  const historical = peekDraftIntents(actor)[0];
  if (!historical) throw new Error("Missing historical draft");
  expect(acknowledgeDraftIntent(actor, historical)).toBe(true);
  expect(localStorage.getItem(key(2))).toBe(raw);
  expect(JSON.parse(localStorage.getItem(key(3)) ?? "null")).toEqual({ version: 3, scope: actor, entries: [] });
  expect(peekDraftIntents(actor)).toEqual([]);
});

it("cannot acknowledge an older upsert after blank intent replaced it", () => {
  const old = stageDraftIntent(actor, 7, "old");
  const blank = stageDraftIntent(actor, 7, "");
  if (!old) throw new Error("Missing upsert");
  expect(acknowledgeDraftIntent(actor, old)).toBe(false);
  expect(peekDraftIntents(actor)).toEqual([blank]);
});

it("keeps oversized editor text volatile without overwriting its previous recoverable draft", () => {
  mockOnline = false;
  stageDraftIntent(actor, 7, "prior text");
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  act(() => hook.result.current.change("x".repeat(10001)));
  expect(hook.result.current.body).toHaveLength(10001);
  expect(mockDirty).toHaveBeenLastCalledWith(true);
  expect(peekDraftIntents(actor)[0]).toMatchObject({ kind: "upsert", body: "prior text" });
});

it("does not roll back another revision's cached draft after an old deletion fails", async () => {
  const pending = deferred<{ deleted: boolean }>();
  mockDelete.mockReturnValue(pending.promise);
  const options = setup();
  const listKey = buildWorkQueryKeys.projects.commentDrafts.mine();
  options.client.setQueryData(listKey, [{ ...draft("old"), ticket: { id: 7 } }]);
  const remove = renderHook(() => useDeleteCommentDraftByTicket(), options);
  act(() => remove.result.current.mutate(7));
  await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
  stageDraftIntent(actor, 7, "newer");
  options.client.setQueryData(listKey, [{ ...draft("newer"), ticket: { id: 7 } }]);
  await act(async () => { pending.complete({ deleted: false }); });
  expect(options.client.getQueryData(listKey)).toEqual([expect.objectContaining({ body: "newer" })]);
  expect(peekDraftIntents(actor)[0]).toMatchObject({ kind: "upsert", body: "newer" });
});

it("does not offer a current-ticket deletion retry for another ticket's failed replay", async () => {
  stageDraftIntent(actor, 8, "other ticket");
  mockPut.mockRejectedValueOnce(new Error("Other ticket denied"));
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
  await act(async () => { await Promise.resolve(); });
  expect(hook.result.current.persistenceError).toBeNull();
  expect(hook.result.current.body).toBe("");
  expect(peekDraftIntents(actor)[0]?.ticketId).toBe(8);
  expect(mockDelete).not.toHaveBeenCalled();
});

it("clears a prior composer error only after its exact revision receives a reconnect save receipt", async () => {
  mockPut.mockRejectedValueOnce(new Error("Temporary outage"));
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  act(() => hook.result.current.change("reconnect text"));
  await act(async () => { await hook.result.current.retryPersistence(); });
  expect(hook.result.current.persistenceError).toBeInstanceOf(Error);
  mockOnline = false; hook.rerender();
  mockOnline = true; hook.rerender();
  await waitFor(() => expect(hook.result.current.persistenceStatus).toBe("Saved"));
  expect(hook.result.current.persistenceError).toBeNull();
  expect(hook.result.current.body).toBe("reconnect text");
  expect(peekDraftIntents(actor)).toEqual([]);
});

it("refuses staging during a suspended owner transition and after hook disposal", async () => {
  mockOnline = false;
  const options = setup();
  const gate = deferred<void>();
  let suspend = false;
  function wrapper({ children }: { children: ReactNode }) { return <options.wrapper><Suspense fallback={null}>{children}</Suspense></options.wrapper>; }
  const hook = renderHook(() => {
    const commands = useUpsertCommentDraft();
    if (suspend) throw gate.promise;
    return commands;
  }, { wrapper });
  const stage = hook.result.current.stageEdit;
  mockSession.data.sessionId = "abandoned-session";
  suspend = true; hook.rerender();
  expect(() => stage({ ticketId: 7, body: "abandoned-session text" })).toThrow("signed-in account changed");
  expect(peekDraftIntents(actor)).toEqual([]);
  mockSession.data.sessionId = "session-a";
  suspend = false;
  await act(async () => { gate.complete(); hook.rerender(); });
  act(() => hook.result.current.stageEdit({ ticketId: 7, body: "committed session only" }));
  hook.unmount();
  expect(() => stage({ ticketId: 7, body: "disposed" })).toThrow("signed-in account changed");
  expect(peekDraftIntents(actor)[0]).toMatchObject({ kind: "upsert", body: "committed session only" });
});
