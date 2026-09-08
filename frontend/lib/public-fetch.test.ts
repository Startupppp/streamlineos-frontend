jest.mock("server-only", () => ({}));
jest.mock("@/lib/backend-url", () => ({ BACKEND_URL: "http://api.test" }));

import { ApiError } from "@/lib/api-envelope";
import { publicGet } from "@/lib/public-fetch";

const mockFetch = jest.fn();
const mockAbortSignalTimeout = jest.fn();

function headerPairs(options: RequestInit | undefined): Record<string, string> {
  const pairs: Record<string, string> = {};
  new Headers(options?.headers).forEach((value, name) => {
    pairs[name.toLowerCase()] = value;
  });
  return pairs;
}

function headerNames(options: RequestInit | undefined): string[] {
  return Object.keys(headerPairs(options)).sort();
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

function make404Response() {
  return {
    ok: false as const,
    status: 404,
    statusText: "Not Found",
    json: () => Promise.resolve({ message: "Not found" }),
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

describe("publicGet", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("authentication", () => {
    it("never sends an Authorization header", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ id: 1 }));

      await publicGet("/public/test");

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit | undefined];
      expect(headerNames(options)).toEqual(["traceparent"]);
    });

    it("fetches the exact backend URL with no token in any form", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({}));

      await publicGet("/public/kb/article");

      const [calledUrl, options] = mockFetch.mock.calls[0] as [string, RequestInit | undefined];
      expect(calledUrl).toBe("http://api.test/public/kb/article");
      const serialised = JSON.stringify({ ...options, headers: headerPairs(options) });
      expect(serialised).not.toContain("Bearer");
      expect(serialised.toLowerCase()).not.toContain("authorization");
      expect(serialised.toLowerCase()).not.toContain("cookie");
    });
  });

  describe("not found", () => {
    it("returns null for a 404 response without throwing", async () => {
      mockFetch.mockResolvedValueOnce(make404Response());

      const result = await publicGet("/public/kb/missing", { org: "org-1" });

      expect(result).toBeNull();
    });
  });

  describe("errors", () => {
    it("throws an ApiError for a 500 response", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(500, "Internal server error"));

      const error = await publicGet("/public/kb").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 500, message: "Internal server error" });
    });

    it("throws an ApiError for a 403 response", async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(403, "Forbidden"));

      const error = await publicGet("/public/test").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 403 });
    });
  });

  describe("timeout", () => {
    it("passes a signal from AbortSignal.timeout(8000) to every fetch call", async () => {
      const fakeSignal = new AbortController().signal;
      mockAbortSignalTimeout.mockReturnValueOnce(fakeSignal);
      mockFetch.mockResolvedValueOnce(makeOkResponse({}));

      await publicGet("/public/test");

      expect(mockAbortSignalTimeout).toHaveBeenCalledWith(8_000);
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit | undefined];
      expect(options?.signal).toBe(fakeSignal);
    });

    it("propagates network and timeout errors", async () => {
      const timeoutError = new DOMException("signal timed out", "TimeoutError");
      mockFetch.mockRejectedValueOnce(timeoutError);

      await expect(publicGet("/public/test")).rejects.toMatchObject({ name: "TimeoutError" });
    });
  });

  describe("success", () => {
    it("returns parsed data from the API envelope", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ id: 42, title: "Getting started" }));

      const result = await publicGet<{ id: number; title: string }>("/public/kb/getting-started");

      expect(result).toEqual({ id: 42, title: "Getting started" });
    });

    it("appends query params to the URL", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ categories: [], articles: [] }));

      await publicGet("/public/kb", { org: "org-123", categoryId: 5 });

      const [calledUrl] = mockFetch.mock.calls[0] as [string];
      expect(calledUrl).toBe("http://api.test/public/kb?org=org-123&categoryId=5");
    });

    it("omits params with undefined values", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ categories: [], articles: [] }));

      await publicGet("/public/kb", { org: "org-123", categoryId: undefined });

      const [calledUrl] = mockFetch.mock.calls[0] as [string];
      expect(calledUrl).toBe("http://api.test/public/kb?org=org-123");
    });
  });
});
