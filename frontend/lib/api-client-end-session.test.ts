process.env.NEXT_PUBLIC_API_URL ??= "http://api.test";

const mockSignOut = jest.fn<Promise<void>, [{ callbackUrl?: string }]>();

jest.mock("next-auth/react", () => ({
  signOut: (opts: { callbackUrl?: string }) => mockSignOut(opts),
}));

import { clearBackendTokenCache, endSession } from "@/lib/api-client";
import { SESSION_EXPIRED_QUERY, SESSION_EXPIRED_VALUE } from "@/lib/auth-session-cookies";

const realLocation = window.location;

function setWindowPathname(pathname: string, search = ""): void {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { pathname, search, assign: jest.fn(), replace: jest.fn(), href: `http://localhost${pathname}${search}` },
  });
}

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: realLocation,
  });
});

beforeEach(() => {
  clearBackendTokenCache();
  mockSignOut.mockResolvedValue(undefined);
  jest.clearAllMocks();
});

describe("endSession — sign-out target carries current path as callbackUrl", () => {
  test("signOut receives a callbackUrl with session=expired and the current page path", async () => {
    setWindowPathname("/build/45", "?tab=board");
    endSession();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    const { callbackUrl } = mockSignOut.mock.calls[0][0];
    expect(callbackUrl).toBeDefined();
    const params = new URLSearchParams(callbackUrl!.replace(/^[^?]*\?/, ""));
    expect(params.get(SESSION_EXPIRED_QUERY)).toBe(SESSION_EXPIRED_VALUE);
    expect(params.get("callbackUrl")).toBe("/build/45?tab=board");
  });

  test("signOut callbackUrl omits the inner callbackUrl when already on /signin", async () => {
    setWindowPathname("/signin", `?${SESSION_EXPIRED_QUERY}=${SESSION_EXPIRED_VALUE}`);
    clearBackendTokenCache();
    endSession();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    const { callbackUrl } = mockSignOut.mock.calls[0][0];
    expect(callbackUrl).toBeDefined();
    const params = new URLSearchParams(callbackUrl!.replace(/^[^?]*\?/, ""));
    expect(params.get("callbackUrl")).toBeNull();
  });
});
