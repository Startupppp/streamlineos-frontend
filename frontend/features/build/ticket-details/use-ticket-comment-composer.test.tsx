import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ApiResponseLike } from "@/lib/api-envelope";
import { OrgStorageScopeProvider } from "@/lib/org-scoped-storage";
import { scopedQueryKeyHashFn } from "@/lib/query-scope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { bufferDraft, peekBuffer, peekDraftIntents } from "@/hooks/api/build/comment-draft-offline-buffer";
import { useTicketCommentComposer } from "./use-ticket-comment-composer";

let mockOnline = true;
let mockAllowed = true;
let mockImpersonating = false;
let mockScope = "authenticated:org-a:user-a";
let mockSession = { status: "authenticated", data: { user: { id: "user-a" }, orgId: "org-a", sessionId: "session-a" } };
const mockRead = jest.fn<Promise<ApiResponseLike>, unknown[]>();
const mockPut = jest.fn<Promise<unknown>, unknown[]>();
const mockDelete = jest.fn<Promise<unknown>, unknown[]>();

jest.mock("next-auth/react", () => ({ useSession: () => mockSession }));
jest.mock("@/hooks/common/use-online-status", () => ({ useOnlineStatus: () => mockOnline }));
jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockAllowed,
  useAccess: () => ({ data: { isOrgOwner: mockAllowed, scopes: {} }, refetch: jest.fn() }),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { request: (...args: unknown[]) => mockRead(...args), put: (...args: unknown[]) => mockPut(...args), delete: (...args: unknown[]) => mockDelete(...args) },
  isImpersonating: () => mockImpersonating,
}));

function draft(body = "saved private draft", ticketId = 7) {
  return { id: 1, orgId: "org-a", membershipId: 11, ticketId, body, createdAt: "2026-10-03T00:00:00.000Z", updatedAt: "2026-10-03T00:00:00.000Z" };
}
function response(data: unknown): ApiResponseLike {
  return { ok: true, status: 200, statusText: "OK", json: async () => ({ success: true, data }) };
}
function deferred<T>() {
  let complete: (value: T) => void = () => { throw new Error("Uninitialized deferred"); };
  const promise = new Promise<T>((resolve) => { complete = resolve; });
  return { promise, complete };
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, queryKeyHashFn: scopedQueryKeyHashFn(mockScope) }, mutations: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <OrgStorageScopeProvider scope={mockScope}><QueryClientProvider client={client}>{children}</QueryClientProvider></OrgStorageScopeProvider>;
  }
  return { client, wrapper: Wrapper };
}

beforeEach(() => {
  localStorage.clear();
  mockOnline = true;
  mockAllowed = true;
  mockImpersonating = false;
  mockScope = "authenticated:org-a:user-a";
  mockSession = { status: "authenticated", data: { user: { id: "user-a" }, orgId: "org-a", sessionId: "session-a" } };
  mockRead.mockReset().mockResolvedValue(response(draft()));
  mockPut.mockReset().mockImplementation(async (_path, input) => ({ ...draft(), ...(typeof input === "object" ? input : {}) }));
  mockDelete.mockReset().mockResolvedValue({ deleted: true });
});

it("loads the caller's exact ticket draft through a fenced private GET and hydrates without saving", async () => {
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await waitFor(() => expect(hook.result.current.body).toBe("saved private draft"));
  expect(mockRead.mock.calls[0]).toMatchObject(["/build/comment-drafts/by-ticket/7", { method: "GET" }, { expectedIdentity: { userId: "user-a", orgId: "org-a", sessionId: "session-a" }, signal: expect.any(AbortSignal) }]);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1250)); });
  expect(mockPut).not.toHaveBeenCalled();
});

it.each(["typing", "clearing", "AI Apply"])("does not replace %s with a late server draft", async (action) => {
  const pending = deferred<ApiResponseLike>();
  mockRead.mockReturnValue(pending.promise);
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  act(() => hook.result.current.change("my current text"));
  if (action === "clearing") act(() => hook.result.current.change(""));
  if (action === "AI Apply") act(() => hook.result.current.change("AI text"));
  await act(async () => { pending.complete(response(draft())); });
  expect(hook.result.current.body).toBe(action === "clearing" ? "" : action === "AI Apply" ? "AI text" : "my current text");
});

it("prefers a valid owner-bound pending local draft and never saves hydration", async () => {
  mockOnline = false;
  bufferDraft(mockScope, 7, "newer offline text");
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await waitFor(() => expect(hook.result.current.body).toBe("newer offline text"));
  expect(peekBuffer(mockScope)[0]?.body).toBe("newer offline text");
  expect(mockPut).not.toHaveBeenCalled();
});

it("keeps the editor empty until a new successful read even when a cached draft exists", async () => {
  const options = setup();
  const first = renderHook(() => useTicketCommentComposer(7, true), options);
  await waitFor(() => expect(first.result.current.body).toBe("saved private draft"));
  first.unmount();
  const pending = deferred<ApiResponseLike>();
  mockRead.mockReturnValue(pending.promise);
  const second = renderHook(() => useTicketCommentComposer(7, true), options);
  expect(second.result.current.body).toBe("");
  await act(async () => { pending.complete(response(draft("fresh draft"))); });
  await waitFor(() => expect(second.result.current.body).toBe("fresh draft"));
});

it.each(["ticket", "user", "organization", "session"])("hides old text synchronously on a %s transition and rejects a late old response", async (transition) => {
  const pending = deferred<ApiResponseLike>();
  mockRead.mockReturnValue(pending.promise);
  const hook = renderHook(({ ticketId }) => useTicketCommentComposer(ticketId, true), { ...setup(), initialProps: { ticketId: 7 } });
  act(() => hook.result.current.change("private old owner text"));
  if (transition === "user") { mockSession.data.user.id = "user-b"; mockScope = "authenticated:org-a:user-b"; }
  if (transition === "organization") { mockSession.data.orgId = "org-b"; mockScope = "authenticated:org-b:user-a"; }
  if (transition === "session") mockSession.data.sessionId = "session-b";
  hook.rerender({ ticketId: transition === "ticket" ? 8 : 7 });
  expect(hook.result.current.body).toBe("");
  mockRead.mockResolvedValue(response(null));
  await act(async () => { pending.complete(response(draft())); });
  expect(hook.result.current.body).toBe("");
  if (transition === "session") expect(mockPut.mock.calls[0]?.[2]).toMatchObject({ expectedIdentity: { userId: "user-a", orgId: "org-a", sessionId: "session-b" } });
  else expect(mockPut).not.toHaveBeenCalled();
});

it.each(["loading", "unauthenticated", "account-only", "denied", "impersonated", "scope-mismatch"])("refuses a private read for %s context", async (context) => {
  if (context === "loading") mockSession.status = "loading";
  if (context === "unauthenticated") mockSession.status = "unauthenticated";
  if (context === "account-only") mockSession.data.orgId = "";
  if (context === "denied") mockAllowed = false;
  if (context === "impersonated") mockImpersonating = true;
  if (context === "scope-mismatch") mockScope = "authenticated:org-a:user-b";
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await act(async () => { await Promise.resolve(); });
  expect(mockRead).not.toHaveBeenCalled();
  expect(hook.result.current.body).toBe("");
});

it.each([0, -1, 1.5, 2147483648, NaN])("refuses a private read for invalid ticket ID %s", async (ticketId) => {
  const hook = renderHook(() => useTicketCommentComposer(ticketId, true), setup());
  await act(async () => { await Promise.resolve(); });
  expect(mockRead).not.toHaveBeenCalled();
  expect(hook.result.current.ready).toBe(false);
});

it("keeps failed draft reads explicit and retries without replacing typed text", async () => {
  mockRead.mockRejectedValue(new Error("Draft read unavailable"));
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await waitFor(() => expect(hook.result.current.loadError).toBeInstanceOf(Error));
  act(() => hook.result.current.change("keep my text"));
  mockRead.mockResolvedValue(response(draft()));
  await act(async () => { await hook.result.current.retry(); });
  expect(hook.result.current.body).toBe("keep my text");
  await waitFor(() => expect(hook.result.current.loadError).toBeNull());
});

it("does not reopen an explicitly cleared composer after a refetch", async () => {
  const options = setup();
  const hook = renderHook(() => useTicketCommentComposer(7, true), options);
  await waitFor(() => expect(hook.result.current.body).toBe("saved private draft"));
  act(() => hook.result.current.clear());
  await act(async () => { await options.client.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.commentDrafts.byTicket(7) }); });
  expect(hook.result.current.body).toBe("");
  expect(mockPut).not.toHaveBeenCalled();
});

it("saves actual edits with the existing debounce and preserves the submitted body", async () => {
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await waitFor(() => expect(hook.result.current.body).toBe("saved private draft"));
  act(() => hook.result.current.change("  edited text  "));
  await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1), { timeout: 2000 });
  expect(mockPut.mock.calls[0]?.[1]).toEqual({ body: "  edited text  " });
});

it("treats a wrong-ticket response as an error and never hydrates it", async () => {
  mockRead.mockResolvedValue(response(draft("another ticket", 9)));
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await waitFor(() => expect(hook.result.current.loadError).toBeInstanceOf(Error));
  expect(hook.result.current.body).toBe("");
});

it("refuses a response belonging to another organization", async () => {
  mockRead.mockResolvedValue(response({ ...draft(), orgId: "org-b" }));
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await waitFor(() => expect(hook.result.current.loadError).toBeInstanceOf(Error));
  expect(hook.result.current.body).toBe("");
});

it("validates the generated wire contract before exposing a saved body", async () => {
  mockRead.mockResolvedValue(response({ ...draft(), body: 123 }));
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await waitFor(() => expect(hook.result.current.loadError).toBeInstanceOf(Error));
  expect(hook.result.current.body).toBe("");
});

it("refuses an in-flight read when impersonation becomes active", async () => {
  const pending = deferred<ApiResponseLike>();
  mockRead.mockReturnValue(pending.promise);
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1));
  act(() => { mockImpersonating = true; window.dispatchEvent(new Event("impersonation-change")); });
  expect(mockRead.mock.calls[0]?.[2]).toMatchObject({ signal: expect.objectContaining({ aborted: true }) });
  await act(async () => { pending.complete(response(draft())); });
  expect(hook.result.current.body).toBe("");
  expect(hook.result.current.ready).toBe(false);
});

it("keeps legacy and corrupt local bytes while using the authorized server draft", async () => {
  localStorage.setItem("slos:comment-draft-pending", JSON.stringify({ "7": "unattributed" }));
  const scopedKey = `${mockScope}::slos:comment-draft-pending:v2`;
  localStorage.setItem(scopedKey, "{corrupt");
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await waitFor(() => expect(hook.result.current.body).toBe("saved private draft"));
  expect(localStorage.getItem(scopedKey)).toBe("{corrupt");
  expect(localStorage.getItem("slos:comment-draft-pending")).toBe(JSON.stringify({ "7": "unattributed" }));
  expect(mockPut).not.toHaveBeenCalled();
});

it("ignores an old context's change handler after the ticket changes", async () => {
  const hook = renderHook(({ ticketId }) => useTicketCommentComposer(ticketId, true), { ...setup(), initialProps: { ticketId: 7 } });
  await waitFor(() => expect(hook.result.current.body).toBe("saved private draft"));
  const oldChange = hook.result.current.change;
  mockRead.mockResolvedValue(response(draft("ticket eight", 8)));
  hook.rerender({ ticketId: 8 });
  await waitFor(() => expect(hook.result.current.body).toBe("ticket eight"));
  act(() => oldChange("old AI completion"));
  expect(hook.result.current.body).toBe("ticket eight");
});

it.each(["upsert", "delete"])("prefers the same owner's pending %s after a fresh new-session read beats delayed replay", async (kind) => {
  mockOnline = false;
  const put = deferred<unknown>();
  const remove = deferred<unknown>();
  mockPut.mockReturnValue(put.promise);
  mockDelete.mockReturnValue(remove.promise);
  const hook = renderHook(() => useTicketCommentComposer(7, true), setup());
  await waitFor(() => expect(hook.result.current.body).toBe("saved private draft"));
  const localBody = kind === "upsert" ? "newer local revision" : "";
  act(() => hook.result.current.change(localBody));
  const original = peekDraftIntents(mockScope)[0];
  mockSession.data.sessionId = "session-b";
  mockOnline = true;
  hook.rerender();
  expect(hook.result.current.body).toBe("");
  await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  expect(hook.result.current.body).toBe(localBody);
  expect(peekDraftIntents(mockScope)[0]).toEqual(original);
  expect(kind === "upsert" ? mockPut : mockDelete).toHaveBeenCalledTimes(1);
  expect(kind === "upsert" ? mockDelete : mockPut).not.toHaveBeenCalled();
  await act(async () => {
    if (kind === "upsert") put.complete(draft(localBody));
    else remove.complete({ deleted: true });
  });
  await waitFor(() => expect(peekDraftIntents(mockScope)).toEqual([]));
  expect(hook.result.current.body).toBe(localBody);
  expect(kind === "upsert" ? mockPut : mockDelete).toHaveBeenCalledTimes(1);
});
