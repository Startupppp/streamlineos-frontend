import { signInWithMagicToken } from "./auth-hooks";

jest.mock("@/lib/api-client", () => ({
  clearBackendTokenCache: jest.fn(),
  clearImpersonation: jest.fn(),
  setAutoSignOutSuppressed: jest.fn(),
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("@/lib/onboarding-gate", () => ({
  clearGateCookies: jest.fn(),
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((loader: () => unknown) => loader),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  useSearchParams: jest.fn(() => ({ get: jest.fn() })),
}));

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

function installAuthJsServer(): jest.Mock {
  const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    if (url.endsWith("/providers"))
      return jsonResponse({ credentials: { id: "credentials", type: "credentials" } });
    if (url.endsWith("/csrf")) return jsonResponse({ csrfToken: "csrf-token" });
    if (url.includes("/callback/credentials")) {
      const body = new URLSearchParams(String(init?.body ?? ""));
      const callbackUrl = body.get("callbackUrl") ?? "/";
      return jsonResponse({ url: new URL(callbackUrl, window.location.origin).toString() });
    }
    if (url.endsWith("/session"))
      return jsonResponse({
        user: { id: "user-1", role: "MEMBER" },
        sessionId: "session-1",
        expires: "2099-01-01T00:00:00.000Z",
      });
    throw new Error(`unexpected fetch: ${url}`);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("credentials sign-in against the real next-auth client", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/signin");
  });

  it("reports signed-in from a /signin URL that already carries ?error=, because Auth.js echoes the callbackUrl back as the success url and the page's own stale error param must not be read as this attempt's verdict", async () => {
    installAuthJsServer();
    window.history.replaceState({}, "", "/signin?error=OAuthCallback&callbackUrl=%2Fdashboard");

    const outcome = await signInWithMagicToken("valid-magic-token");

    expect(outcome).toEqual({ status: "signed-in" });
  });

  it("still reports failed when Auth.js itself rejects the token, proving the echo fix did not blind the real rejection path", async () => {
    const fetchMock = installAuthJsServer();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.endsWith("/providers"))
        return jsonResponse({ credentials: { id: "credentials", type: "credentials" } });
      if (url.endsWith("/csrf")) return jsonResponse({ csrfToken: "csrf-token" });
      if (url.includes("/callback/credentials"))
        return jsonResponse({
          url: `${window.location.origin}/signin?error=CredentialsSignin&code=credentials`,
        });
      throw new Error(`unexpected fetch: ${url}`);
    });
    window.history.replaceState({}, "", "/signin");

    const outcome = await signInWithMagicToken("rejected-magic-token");

    expect(outcome).toEqual({ status: "failed" });
  });

  it("sends a param-free callbackUrl so the echoed success url can never inherit a query param from the signin page", async () => {
    const fetchMock = installAuthJsServer();
    window.history.replaceState({}, "", "/signin?error=OAuthCallback");

    await signInWithMagicToken("valid-magic-token");

    const callbackCall = fetchMock.mock.calls.find(([input]) =>
      String(input).includes("/callback/credentials"),
    );
    const body = new URLSearchParams(String(callbackCall?.[1]?.body ?? ""));
    expect(body.get("callbackUrl")).toBe("/dashboard");
  });

  it("reaches the session endpoint no more than once, because two extra confirmation probes were the bulk of sign-in latency", async () => {
    const fetchMock = installAuthJsServer();

    await signInWithMagicToken("valid-magic-token");

    const sessionCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/session"),
    );
    expect(sessionCalls.length).toBeLessThanOrEqual(1);
  });
});
