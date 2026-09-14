import type { Session } from "next-auth";
import { getSession, signIn } from "next-auth/react";
import { signInWithMagicToken } from "./auth-hooks";

jest.mock("next-auth/react", () => ({
  getSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(() => ({
    update: jest.fn(),
    status: "unauthenticated",
    data: null,
  })),
}));

jest.mock("@/lib/api-client", () => ({
  clearBackendTokenCache: jest.fn(),
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

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

function makeSession(sessionId: string | undefined, userId: string): Session {
  return {
    user: { id: userId, role: "MEMBER" },
    sessionId,
    expires: "2099-01-01T00:00:00.000Z",
  };
}

function signInAccepted() {
  return { ok: true, error: undefined, code: undefined, status: 200, url: null };
}

function signInRejected(error: string) {
  return { ok: false, error, code: undefined, status: 401, url: null };
}

describe("I4 — signInWithMagicToken outcome discrimination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns failed for an empty token without calling signIn", async () => {
    const outcome = await signInWithMagicToken("");
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(outcome.status).toBe("failed");
  });

  it("returns failed when credentials result is not ok", async () => {
    mockSignIn.mockResolvedValueOnce(signInRejected("Unauthorized"));
    const outcome = await signInWithMagicToken("some-token");
    expect(outcome.status).toBe("failed");
  });

  it("returns failed when credentials result is ok but carries an error", async () => {
    mockSignIn.mockResolvedValueOnce({
      ok: true,
      error: "CredentialsSignin",
      code: undefined,
      status: 200,
      url: null,
    });
    const outcome = await signInWithMagicToken("some-token");
    expect(outcome.status).toBe("failed");
  });

  it("does not report signed-in when credentials fail and an existing user-A session is present", async () => {
    mockSignIn.mockResolvedValueOnce(signInRejected("Unauthorized"));
    const outcome = await signInWithMagicToken("bad-token");
    expect(outcome.status).toBe("failed");
  });

  it("returns signed-in when a new session is established from no prior session", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession("session-new", "user-b"));
    mockSignIn.mockResolvedValueOnce(signInAccepted());
    const outcome = await signInWithMagicToken("valid-token");
    expect(outcome.status).toBe("signed-in");
  });

  it("returns signed-in when signIn succeeds and the post-probe session is valid", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession("session-new", "user-b"));
    mockSignIn.mockResolvedValueOnce(signInAccepted());
    const outcome = await signInWithMagicToken("valid-token");
    expect(outcome.status).toBe("signed-in");
  });

  it("returns signed-in when signIn throws but a new session is confirmable afterwards", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession("session-new", "user-b"));
    mockSignIn.mockRejectedValueOnce(new Error("Network timeout"));
    const outcome = await signInWithMagicToken("valid-token");
    expect(outcome.status).toBe("signed-in");
  });

  it("returns indeterminate when signIn throws and the confirming session read also fails", async () => {
    mockGetSession.mockRejectedValueOnce(new Error("Session read failed"));
    mockSignIn.mockRejectedValueOnce(new Error("Network timeout"));
    const outcome = await signInWithMagicToken("valid-token");
    expect(outcome.status).toBe("indeterminate");
  });

  it("returns indeterminate when the session read after sign-in fails", async () => {
    mockGetSession.mockRejectedValueOnce(new Error("Session read failed"));
    mockSignIn.mockResolvedValueOnce(signInAccepted());
    const outcome = await signInWithMagicToken("valid-token");
    expect(outcome.status).toBe("indeterminate");
  });

  it("returns signed-in when signIn succeeds even if the post-probe session has any valid sessionId", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession("same-session", "user-a"));
    mockSignIn.mockResolvedValueOnce(signInAccepted());
    const outcome = await signInWithMagicToken("token-abc");
    expect(outcome.status).toBe("signed-in");
  });

  it("returns indeterminate when signIn is ok but the session carries no sessionId", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession(undefined, "user-b"));
    mockSignIn.mockResolvedValueOnce(signInAccepted());
    const outcome = await signInWithMagicToken("token-abc");
    expect(outcome.status).toBe("indeterminate");
  });

  it("returns indeterminate when signIn is ok but no session exists afterwards", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    mockSignIn.mockResolvedValueOnce(signInAccepted());
    const outcome = await signInWithMagicToken("token-abc");
    expect(outcome.status).toBe("indeterminate");
  });

  it("does not retry a consumed single-use token after failure — signIn is called exactly once", async () => {
    mockSignIn.mockResolvedValueOnce(signInRejected("Token already used"));
    await signInWithMagicToken("one-shot-token");
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });
});
