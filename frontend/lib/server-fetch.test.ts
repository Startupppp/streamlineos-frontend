jest.mock("@/lib/get-server-auth", () => ({ getServerAuth: jest.fn() }));
jest.mock("@/lib/backend-url", () => ({ BACKEND_URL: "http://api.test" }));

import type { Session } from "next-auth";

beforeAll(() => {
  if (typeof AbortSignal.timeout !== "function")
    Object.defineProperty(AbortSignal, "timeout", {
      configurable: true,
      value: (_ms: number) => new AbortController().signal,
    });
});
import { serverGet } from "@/lib/server-fetch";
import { getServerAuth } from "@/lib/get-server-auth";
import { ApiError } from "@/lib/api-envelope";

const mockAuth = jest.mocked(getServerAuth);

const SESSION: Session = {
  user: { id: "u1", role: "MEMBER" },
  expires: "2099-01-01T00:00:00Z",
  backendJwt: "tok.en.here",
};

function fakeFetch(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("serverGet — no token", () => {
  it("fails closed when the session is null", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(serverGet("/test")).rejects.toBeInstanceOf(ApiError);
  });

  it("fails closed when backendJwt is absent", async () => {
    mockAuth.mockResolvedValue({ ...SESSION, backendJwt: undefined });
    await expect(serverGet("/test")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("serverGet — success shapes", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(SESSION);
  });

  it("unwraps a success envelope to its data", async () => {
    fakeFetch(200, { success: true, data: { id: 7 } });
    const result = await serverGet<{ id: number }>("/test");
    expect(result).toEqual({ id: 7 });
  });

  it("returns undefined for a 204", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: "No Content",
      json: async () => null,
    });
    const result = await serverGet<undefined>("/test");
    expect(result).toBeUndefined();
  });

  it("throws an ApiError for a server error", async () => {
    fakeFetch(500, { message: "Internal error" });
    await expect(serverGet("/test")).rejects.toBeInstanceOf(ApiError);
  });

  it("sends the Authorization header with the session token", async () => {
    fakeFetch(200, { success: true, data: null });
    await serverGet("/test");
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer tok.en.here",
    );
  });

  it("targets BACKEND_URL not NEXT_PUBLIC_API_URL", async () => {
    fakeFetch(200, { success: true, data: null });
    await serverGet("/test");
    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
    expect(url).toMatch(/^http:\/\/api\.test/);
  });
});
