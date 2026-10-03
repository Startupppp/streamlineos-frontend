import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { authenticatedScope } from "@/lib/query-scope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { useApproval, useDeleteApproval, useUpdateApproval, useDecideApproval } from "../approvals";

let session = { orgId: "org-1", sessionId: "session-1", user: { id: "user-1" } };
let allowed = true;
let impersonating = false;
let accessReady = true;
const accessRefetch = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: { delete: jest.fn(), patch: jest.fn(), get: jest.fn(), request: jest.fn() },
  isImpersonating: () => impersonating,
}));
jest.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated", data: session }) }));
jest.mock("@/hooks/api/access", () => ({
  useCan: () => allowed,
  useAccess: () => ({ data: accessReady ? { isOrgOwner: true } : undefined, refetch: accessRefetch }),
}));

const row = {
  id: 7, revision: 3, orgId: "org-1", projectId: 42, entityType: "task", entityId: 8,
  title: "Reviewed approval", reason: null, requestedById: null, approverMembershipId: 1,
  status: "pending", level: 1, dueAt: null, decisionComment: null, decidedAt: null,
  createdBy: null, deletedAt: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
};
function wire(data: unknown): Response {
  const body = { success: true, data };
  return { ok: true, status: 200, statusText: "OK", headers: new Headers({ "content-type": "application/json" }), body: null, bodyUsed: false,
    type: "basic", url: "http://api.test/build/42/approvals/7", redirected: false, json: async () => body, text: async () => JSON.stringify(body),
    arrayBuffer: async () => new ArrayBuffer(0), blob: async () => new Blob(), formData: async () => new FormData(), bytes: async () => new Uint8Array(), clone: () => wire(data) };
}
function setup() {
  const client = createAppQueryClient(authenticatedScope("org-1", "user-1"));
  function wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }
  return { client, wrapper };
}
beforeEach(() => {
  jest.clearAllMocks();
  session = { orgId: "org-1", sessionId: "session-1", user: { id: "user-1" } };
  allowed = true; accessReady = true; impersonating = false;
  jest.mocked(apiClient.delete).mockResolvedValue(undefined);
  jest.mocked(apiClient.patch).mockResolvedValue(row);
  jest.mocked(apiClient.request).mockImplementation(async () => wire(row));
});

it("deletes the reviewed revision and reconciles filtered queues without subtracting a cached count", async () => {
  const { client, wrapper } = setup();
  const filtered = buildWorkQueryKeys.projects.approvals.inbox({ status: "pending" });
  const count = buildWorkQueryKeys.projects.approvals.inboxCount();
  client.setQueryData(filtered, { data: [{ id: 7 }], pagination: { hasMore: false, nextCursor: null } });
  client.setQueryData(count, { count: 9 });
  const { result } = renderHook(() => useDeleteApproval(42), { wrapper });
  await act(async () => { await result.current.mutateAsync({ approvalId: 7, expectedRevision: 3 }); });
  expect(apiClient.delete).toHaveBeenCalledWith("/build/42/approvals/7", { expectedRevision: 3 }, expect.objectContaining({
    expectedIdentity: { orgId: "org-1", userId: "user-1", sessionId: "session-1" }, signal: expect.any(AbortSignal),
  }), expect.anything());
  expect(client.getQueryData(count)).toEqual({ count: 9 });
  expect(client.getQueryState(filtered)?.isInvalidated).toBe(true);
  expect(client.getQueryState(count)?.isInvalidated).toBe(true);
});

it("refuses command dispatch without the canonical permission", async () => {
  allowed = false;
  const { wrapper } = setup();
  const { result } = renderHook(() => useDeleteApproval(42), { wrapper });
  await act(async () => { await expect(result.current.mutateAsync({ approvalId: 7, expectedRevision: 3 })).rejects.toThrow("Missing permission"); });
  expect(apiClient.delete).not.toHaveBeenCalled();
});

it("rejects an obsolete invocation after the permission read settles", async () => {
  accessReady = false;
  let release: (() => void) | undefined;
  accessRefetch.mockImplementation(() => new Promise((resolve) => { release = () => resolve({ data: { isOrgOwner: true } }); }));
  const { wrapper } = setup();
  const { result, rerender } = renderHook(() => useUpdateApproval(42), { wrapper });
  const settled = result.current.mutateAsync({ approvalId: 7, expectedRevision: 3, status: "cancelled" }).catch((error: unknown) => error);
  await waitFor(() => expect(accessRefetch).toHaveBeenCalled());
  session = { ...session, sessionId: "session-2" }; rerender();
  await act(async () => { release?.(); await settled; });
  expect(apiClient.patch).not.toHaveBeenCalled();
});

it("does not acknowledge or invalidate an old session's completed mutation", async () => {
  let release: (() => void) | undefined;
  jest.mocked(apiClient.patch).mockImplementation(() => new Promise((resolve) => { release = () => resolve(row); }));
  const { client, wrapper } = setup();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const onSuccess = jest.fn();
  const { result, rerender } = renderHook(() => useDecideApproval(42), { wrapper });
  const settled = result.current.mutateAsync({ approvalId: 7, expectedRevision: 3, decision: "approved" }, { onSuccess }).catch((error: unknown) => error);
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalled());
  session = { ...session, sessionId: "session-2" }; rerender();
  await act(async () => { release?.(); await settled; });
  expect(onSuccess).not.toHaveBeenCalled();
  expect(invalidate).not.toHaveBeenCalled();
});

it("keeps the invoked project bound while an authority read waits across rerender", async () => {
  accessReady = false;
  let release: (() => void) | undefined;
  accessRefetch.mockImplementation(() => new Promise((resolve) => { release = () => resolve({ data: { isOrgOwner: true } }); }));
  const { wrapper } = setup();
  const { result, rerender } = renderHook(({ projectId }) => useUpdateApproval(projectId), { wrapper, initialProps: { projectId: 42 } });
  const settled = result.current.mutateAsync({ approvalId: 7, expectedRevision: 3, status: "cancelled" });
  await waitFor(() => expect(accessRefetch).toHaveBeenCalled());
  rerender({ projectId: 43 });
  await act(async () => { release?.(); await settled; });
  expect(apiClient.patch).toHaveBeenCalledWith("/build/42/approvals/7", { expectedRevision: 3, status: "cancelled" }, expect.anything(), expect.anything());
});

it("requires a fresh detail receipt and sends the native signal with the exact trusted identity", async () => {
  let release: (() => void) | undefined;
  jest.mocked(apiClient.request).mockImplementation(() => new Promise((resolve) => { release = () => resolve(wire(row)); }));
  const { client, wrapper } = setup();
  client.setQueryData(buildWorkQueryKeys.projects.approvals.detail(42, 7), { approval: { ...row, title: "Old cached title" }, ownerStamp: "old-lease" });
  const { result } = renderHook(() => useApproval(42, 7), { wrapper });
  await waitFor(() => expect(apiClient.request).toHaveBeenCalled());
  expect(result.current.data).toBeUndefined();
  expect(apiClient.request).toHaveBeenCalledWith("/build/42/approvals/7", { method: "GET" }, {
    signal: expect.any(AbortSignal), expectedIdentity: { orgId: "org-1", userId: "user-1", sessionId: "session-1" },
  });
  await act(async () => { release?.(); });
  await waitFor(() => expect(result.current.data?.revision).toBe(3));
});

it("aborts the old detail read and never presents its late record after reauthentication", async () => {
  let oldSignal: AbortSignal | undefined;
  let release: (() => void) | undefined;
  jest.mocked(apiClient.request).mockImplementationOnce((_path, _request, config) => {
    oldSignal = config?.signal;
    return new Promise((resolve) => { release = () => resolve(wire({ ...row, title: "Old session title" })); });
  });
  const { wrapper } = setup();
  const { result, rerender } = renderHook(() => useApproval(42, 7), { wrapper });
  await waitFor(() => expect(apiClient.request).toHaveBeenCalledTimes(1));
  session = { ...session, sessionId: "session-2" }; rerender();
  expect(result.current.data).toBeUndefined();
  await waitFor(() => expect(oldSignal?.aborted).toBe(true));
  await waitFor(() => expect(apiClient.request).toHaveBeenCalledTimes(2));
  await act(async () => { release?.(); });
  await waitFor(() => expect(result.current.data?.title).toBe("Reviewed approval"));
});

it.each([
  { data: { ...row, orgId: "org-other" }, message: "requested record" },
  { data: { ...row, id: 8 }, message: "requested record" },
  { data: { ...row, revision: 0 }, message: "does not understand" },
])("refuses an unauthorized or malformed detail response $message", async ({ data, message }) => {
  jest.mocked(apiClient.request).mockImplementation(async () => wire(data));
  const { wrapper } = setup();
  const { result } = renderHook(() => useApproval(42, 7), { wrapper });
  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(result.current.error).toBeInstanceOf(ApiError);
  expect(result.current.error).toMatchObject({ message: expect.stringContaining(message) });
  expect(result.current.data).toBeUndefined();
});

it("hides an already reviewed detail immediately when read permission is revoked", async () => {
  const { wrapper } = setup();
  const { result, rerender } = renderHook(() => useApproval(42, 7), { wrapper });
  await waitFor(() => expect(result.current.data?.id).toBe(7));
  allowed = false; rerender();
  expect(result.current.data).toBeUndefined();
  expect(result.current.ownerStamp).toBeNull();
});

it("does not send malformed revision bodies", async () => {
  const { wrapper } = setup();
  const { result } = renderHook(() => useDeleteApproval(42), { wrapper });
  await act(async () => { await expect(result.current.mutateAsync({ approvalId: 7, expectedRevision: 0 })).rejects.toThrow(); });
  expect(apiClient.delete).not.toHaveBeenCalled();
});

it("propagates an original conflict without removing a filtered item", async () => {
  const { client, wrapper } = setup();
  const key = buildWorkQueryKeys.projects.approvals.inbox({ status: "pending" });
  client.setQueryData(key, { data: [row] });
  const conflict = new ApiError("Revision changed", 409);
  jest.mocked(apiClient.patch).mockRejectedValue(conflict);
  const { result } = renderHook(() => useDecideApproval(42), { wrapper });
  await act(async () => { await expect(result.current.mutateAsync({ approvalId: 7, expectedRevision: 3, decision: "approved" })).rejects.toBe(conflict); });
  expect(client.getQueryData(key)).toEqual({ data: [row] });
  expect(client.getQueryState(key)?.isInvalidated).toBe(true);
});

it("routes an inbox management command to its loaded project without leaking routing fields into the strict body", async () => {
  const { wrapper } = setup();
  const { result } = renderHook(() => useUpdateApproval(), { wrapper });
  await act(async () => { await result.current.mutateAsync({ projectId: 42, approvalId: 7, expectedRevision: 3, status: "cancelled" }); });
  expect(apiClient.patch).toHaveBeenCalledWith("/build/42/approvals/7", { expectedRevision: 3, status: "cancelled" }, expect.anything(), expect.anything());
});
