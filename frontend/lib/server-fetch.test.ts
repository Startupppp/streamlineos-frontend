jest.mock("server-only", () => ({}));

jest.mock("react", () => {
  const actual = jest.requireActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <Args extends readonly unknown[], Return>(
      fn: (...args: Args) => Return,
    ): ((...args: Args) => Return) => {
      type CacheEntry = { value: Return };
      const memo = new Map<string, CacheEntry>();
      return (...args: Args): Return => {
        const key = JSON.stringify(args);
        const hit = memo.get(key);
        if (hit !== undefined) return hit.value;
        const value = fn(...args);
        memo.set(key, { value });
        return value;
      };
    },
  };
});

jest.mock("@/lib/backend-url", () => ({ BACKEND_URL: "http://api.test" }));

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(),
}));

import type { Session } from "next-auth";
import { getServerAuth } from "@/lib/get-server-auth";
import { ApiError } from "@/lib/api-envelope";
import { serverGet } from "@/lib/server-fetch";

const mockedGetServerAuth = jest.mocked(getServerAuth);
const mockFetch = jest.fn();
const mockAbortSignalTimeout = jest.fn();

function makeSession(backendJwt: string): Session {
  return { user: { id: "u1", role: "MEMBER" }, backendJwt, expires: "2099-01-01" };
}

function makeOkResponse(data: unknown) {
  return {
    ok: true as const,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve({ success: true, data }),
  };
}

function makeErrorResponse(status: number, message: string) {
  return {
    ok: false as const,
    status,
    statusText: "Error",
    json: () => Promise.resolve({ message }),
  };
}

beforeAll(() => {
  Object.defineProperty(global, "fetch", {
    writable: true,
    configurable: true,
    value: mockFetch,
  });
  Object.defineProperty(AbortSignal, "timeout", {
    writable: true,
    configurable: true,
    value: mockAbortSignalTimeout,
  });
});

afterAll(() => {
  Object.defineProperty(global, "fetch", {
    writable: true,
    configurable: true,
    value: undefined,
  });
});

describe("serverGet", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("isolation", () => {
    it("makes a separate fetch call for each caller with a distinct token on the same path", async () => {
      mockedGetServerAuth
        .mockResolvedValueOnce(makeSession("token-alice"))
        .mockResolvedValueOnce(makeSession("token-bob"));

      mockFetch
        .mockResolvedValueOnce(makeOkResponse({ caller: "alice" }))
        .mockResolvedValueOnce(makeOkResponse({ caller: "bob" }));

      const resAlice = await serverGet<{ caller: string }>("/test/isolation/two-callers");
      const resBob = await serverGet<{ caller: string }>("/test/isolation/two-callers");

      expect(resAlice).toEqual({ caller: "alice" });
      expect(resBob).toEqual({ caller: "bob" });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "http://api.test/test/isolation/two-callers",
        expect.objectContaining({
          headers: { Authorization: "Bearer token-alice" },
        }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "http://api.test/test/isolation/two-callers",
        expect.objectContaining({
          headers: { Authorization: "Bearer token-bob" },
        }),
      );
    });
  });

  describe("authentication", () => {
    it("throws an ApiError(401, UNAUTHENTICATED) and never calls fetch when there is no session", async () => {
      mockedGetServerAuth.mockResolvedValueOnce(null);

      const rejection = serverGet("/test/no-session");

      await expect(rejection).rejects.toBeInstanceOf(ApiError);
      await expect(rejection).rejects.toMatchObject({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("timeout", () => {
    it("passes the signal from AbortSignal.timeout(8000) to every fetch call", async () => {
      const fakeSignal = new AbortController().signal;
      mockAbortSignalTimeout.mockReturnValueOnce(fakeSignal);
      mockedGetServerAuth.mockResolvedValueOnce(makeSession("token-test"));
      mockFetch.mockResolvedValueOnce(makeOkResponse({ ok: true }));

      await serverGet("/test/timeout-signal");

      expect(mockAbortSignalTimeout).toHaveBeenCalledWith(8_000);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://api.test/test/timeout-signal",
        expect.objectContaining({ signal: fakeSignal }),
      );
    });

    it("propagates the abort error when the upstream does not respond in time", async () => {
      const timeoutError = new DOMException("signal timed out", "TimeoutError");
      mockedGetServerAuth.mockResolvedValueOnce(makeSession("token-test"));
      mockFetch.mockRejectedValueOnce(timeoutError);

      await expect(serverGet("/test/timeout-abort")).rejects.toMatchObject({
        name: "TimeoutError",
      });
    });
  });

  describe("error envelope", () => {
    it("parses a non-OK response into an ApiError via the shared envelope", async () => {
      mockedGetServerAuth.mockResolvedValueOnce(makeSession("token-test"));
      mockFetch.mockResolvedValueOnce(makeErrorResponse(404, "Resource not found"));

      const rejection = serverGet("/test/error-envelope");

      await expect(rejection).rejects.toBeInstanceOf(ApiError);
      await expect(rejection).rejects.toMatchObject({
        status: 404,
        message: "Resource not found",
      });
    });
  });
});
