import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { apiClient, clearBackendTokenCache, clearImpersonation, setImpersonationToken } from "./api-client";

installAbortSignalPolyfill();

const identity = { userId: "user-a", orgId: "org-a", sessionId: "session-a" };
const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;
const mockSignOut = jest.fn();
jest.mock("next-auth/react", () => ({ signOut: (...args: unknown[]) => mockSignOut(...args) }));

function jwt(claims: object): string {
  return "header." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600, ...claims })).toString("base64url") + ".signature";
}

function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, headers: new Headers({ "content-type": "application/json" }), json: async () => body, clone: () => ({ json: async () => body }) };
}

beforeEach(() => {
  clearBackendTokenCache();
  clearImpersonation();
  fetchMock.mockReset();
  mockSignOut.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => { globalThis.fetch = originalFetch; clearImpersonation(); });

it.each([
  { sub: "user-b", orgId: "org-a", sessionId: "session-a" },
  { sub: "user-a", orgId: "org-b", sessionId: "session-a" },
  { sub: "user-a", orgId: "org-a", sessionId: "session-b" },
  { orgId: "org-a", sessionId: "session-a" },
])("refuses a fenced PUT before transmitting its body under mismatched selected credentials", async (claims) => {
  fetchMock.mockResolvedValue(response(200, { backendJwt: jwt(claims) }));
  await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "private A" }, { expectedIdentity: identity })).rejects.toMatchObject({ code: "REQUEST_IDENTITY_CHANGED" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/auth/session");
});

it.each(["malformed", "a.e30.c", "a.!.c", "a.e30.c.extra"])("refuses missing or malformed identity claims before transmitting a fenced body", async (token) => {
  fetchMock.mockResolvedValue(response(200, { backendJwt: token }));
  await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "private A" }, { expectedIdentity: identity })).rejects.toMatchObject({ code: "REQUEST_IDENTITY_CHANGED" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("sends an ordinary fenced body only with its exact user, organization and session", async () => {
  fetchMock.mockResolvedValueOnce(response(200, { backendJwt: jwt({ sub: identity.userId, orgId: identity.orgId, sessionId: identity.sessionId }) }));
  fetchMock.mockResolvedValueOnce(response(200, { success: true, data: { saved: true } }));
  await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "private A" }, { expectedIdentity: identity })).resolves.toEqual({ saved: true });
  expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ body: "private A" }));
});

it("checks the replacement JWT again before a 401 retry can send another person's body", async () => {
  fetchMock.mockResolvedValueOnce(response(200, { backendJwt: jwt({ sub: identity.userId, orgId: identity.orgId, sessionId: identity.sessionId }) }));
  fetchMock.mockResolvedValueOnce(response(401, { code: "AUTH_TOKEN_EXPIRED" }));
  fetchMock.mockResolvedValueOnce(response(200, { backendJwt: jwt({ sub: "user-b", orgId: "org-a", sessionId: "session-b" }) }));
  await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "private A" }, { expectedIdentity: identity })).rejects.toMatchObject({ code: "REQUEST_IDENTITY_CHANGED" });
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(fetchMock.mock.calls.filter(([url]) => !String(url).includes("/api/auth/session"))).toHaveLength(1);
});

it("permits a 401 retry whose new token belongs to the same expected session", async () => {
  const claims = { sub: identity.userId, orgId: identity.orgId, sessionId: identity.sessionId };
  fetchMock.mockResolvedValueOnce(response(200, { backendJwt: jwt(claims) }));
  fetchMock.mockResolvedValueOnce(response(401, { code: "AUTH_TOKEN_EXPIRED" }));
  fetchMock.mockResolvedValueOnce(response(200, { backendJwt: jwt({ ...claims, marker: "refreshed" }) }));
  fetchMock.mockResolvedValueOnce(response(200, { success: true, data: { saved: true } }));
  await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "private A" }, { expectedIdentity: identity })).resolves.toEqual({ saved: true });
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

it("checks cancellation after awaited token acquisition and transmits no cancelled body", async () => {
  const controller = new AbortController();
  fetchMock.mockImplementationOnce(async () => {
    controller.abort();
    return response(200, { backendJwt: jwt({ sub: identity.userId, orgId: identity.orgId, sessionId: identity.sessionId }) });
  });
  await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "private A" }, { expectedIdentity: identity, signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("refuses an impersonated target token without forcing a request as the real user", async () => {
  setImpersonationToken(jwt({ sub: "target-user", orgId: "org-a", sessionId: "target-session" }), { id: "target-user", name: null, email: "target@example.test" });
  await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "private A" }, { expectedIdentity: identity })).rejects.toMatchObject({ code: "REQUEST_IDENTITY_CHANGED" });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("preserves existing unfenced calls when their token has no draft-specific identity metadata", async () => {
  fetchMock.mockResolvedValueOnce(response(200, { backendJwt: jwt({ marker: "existing caller" }) }));
  fetchMock.mockResolvedValueOnce(response(200, { success: true, data: { saved: true } }));
  await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "normal" })).resolves.toEqual({ saved: true });
});

it.each([false, true])("refuses impersonation enabled during token acquisition before transmitting a fenced body, retry=%s", async (retry) => {
  const realToken = jwt({ sub: identity.userId, orgId: identity.orgId, sessionId: identity.sessionId });
  if (retry) {
    fetchMock.mockResolvedValueOnce(response(200, { backendJwt: realToken }));
    fetchMock.mockResolvedValueOnce(response(401, { code: "AUTH_TOKEN_EXPIRED" }));
  }
  fetchMock.mockImplementationOnce(async () => {
    setImpersonationToken(jwt({ sub: "target-user", orgId: "org-a", sessionId: "target-session" }), { id: "target-user", name: null, email: "target@example.test" });
    return response(200, { backendJwt: realToken });
  });
  await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "private A" }, { expectedIdentity: identity })).rejects.toMatchObject({ code: "REQUEST_IDENTITY_CHANGED" });
  expect(fetchMock).toHaveBeenCalledTimes(retry ? 3 : 1);
});

it("refuses a null 401 refresh without signing out another active session", async () => {
  fetchMock.mockResolvedValueOnce(response(200, { backendJwt: jwt({ sub: identity.userId, orgId: identity.orgId, sessionId: identity.sessionId }) }));
  fetchMock.mockResolvedValueOnce(response(401, { code: "AUTH_TOKEN_EXPIRED" }));
  fetchMock.mockResolvedValueOnce(response(200, {}));
  await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "private A" }, { expectedIdentity: identity })).rejects.toMatchObject({ code: "REQUEST_IDENTITY_CHANGED" });
  await Promise.resolve();
  expect(mockSignOut).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it.each([401, 403])("refuses stale account side effects after an old fenced response with status %s", async (status) => {
  const controller = new AbortController();
  fetchMock.mockResolvedValueOnce(response(200, { backendJwt: jwt({ sub: identity.userId, orgId: identity.orgId, sessionId: identity.sessionId }) }));
  fetchMock.mockImplementationOnce(async () => {
    clearBackendTokenCache();
    controller.abort();
    return response(status, { code: status === 403 ? "ORGANIZATION_SUSPENDED" : "AUTH_TOKEN_EXPIRED" });
  });
  fetchMock.mockResolvedValueOnce(response(200, { backendJwt: jwt({ sub: "user-b", orgId: "org-b", sessionId: "session-b" }) }));
  await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "private A" }, { expectedIdentity: identity, signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
  expect(mockSignOut).not.toHaveBeenCalled();
});

it("surfaces a fenced terminal 401 without a global sign-out", async () => {
  const claims = { sub: identity.userId, orgId: identity.orgId, sessionId: identity.sessionId };
  fetchMock.mockResolvedValueOnce(response(200, { backendJwt: jwt(claims) }));
  fetchMock.mockResolvedValueOnce(response(401, { code: "AUTH_TOKEN_EXPIRED" }));
  fetchMock.mockResolvedValueOnce(response(200, { backendJwt: jwt({ ...claims, marker: "refreshed" }) }));
  fetchMock.mockImplementationOnce(async () => { clearBackendTokenCache(); return response(401, { code: "AUTH_TOKEN_EXPIRED" }); });
  await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "private A" }, { expectedIdentity: identity })).rejects.toMatchObject({ status: 401 });
  await Promise.resolve();
  expect(mockSignOut).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

it("surfaces an old organization's fenced 403 without redirecting a newly active account", async () => {
  const originalLocation = window.location;
  const replace = jest.fn();
  Object.defineProperty(window, "location", { configurable: true, value: { pathname: "/build/projects", replace } });
  try {
    fetchMock.mockResolvedValueOnce(response(200, { backendJwt: jwt({ sub: identity.userId, orgId: identity.orgId, sessionId: identity.sessionId }) }));
    fetchMock.mockImplementationOnce(async () => { clearBackendTokenCache(); return response(403, { code: "ORG_MEMBERSHIP_SUSPENDED" }); });
    await expect(apiClient.put("/build/comment-drafts/tickets/1", { body: "private A" }, { expectedIdentity: identity })).rejects.toMatchObject({ status: 403 });
    expect(replace).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  } finally {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  }
});
