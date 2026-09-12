import { renderHook, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import {
  INBOX_ERROR_RECOVERY_MS,
  inboxErrorRecoveryInterval,
  useUnifiedInbox,
} from "./inbox";
import { apiClientMock, wrapper } from "./notifications-inbox-test-fixtures";

class MockApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1" } },
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      items: [],
      hasMore: false,
      nextCursor: null,
      sources: [],
      degraded: false,
    }),
    post: jest.fn().mockResolvedValue({ success: true }),
    patch: jest.fn().mockResolvedValue({ success: true }),
    delete: jest.fn().mockResolvedValue({ success: true }),
  },
  isApiError: (error: unknown) => error instanceof MockApiError,
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe("useUnifiedInbox abort-signal propagation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes the query's AbortSignal in apiClient.get's signal slot, not the params slot", async () => {
    const client = makeClient();
    const apiClient = apiClientMock();

    renderHook(() => useUnifiedInbox({ limit: 25 }), { wrapper: wrapper(client) });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(apiClient.get).toHaveBeenCalled();
    const [, params, signal] = apiClient.get.mock.calls[0] as [unknown, unknown, unknown];
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(params).not.toBeInstanceOf(AbortSignal);
  });
});

describe("the inbox heals itself after a transient read failure", () => {
  const at = (status: string, error: Error | null) =>
    inboxErrorRecoveryInterval({ state: { status, error } });

  it("does not poll while the read is succeeding", () => {
    expect(at("success", null)).toBe(false);
  });

  it("does not poll while the first read is still pending", () => {
    expect(at("pending", null)).toBe(false);
  });

  it("re-attempts a 500 so the surface recovers without a reload", () => {
    expect(at("error", new MockApiError("Internal Server Error", 500))).toBe(
      INBOX_ERROR_RECOVERY_MS,
    );
  });

  it("re-attempts a network failure that carries no status", () => {
    expect(at("error", new Error("Failed to fetch"))).toBe(
      INBOX_ERROR_RECOVERY_MS,
    );
  });

  it("BITE PROOF — a 403 is a verdict, not a blip, so it is never polled", () => {
    expect(at("error", new MockApiError("Forbidden", 403))).toBe(false);
  });

  it("BITE PROOF — a 404 is not polled either", () => {
    expect(at("error", new MockApiError("Not Found", 404))).toBe(false);
  });

  it("re-attempts the two 4xx that invite a retry", () => {
    expect(at("error", new MockApiError("Timeout", 408))).toBe(
      INBOX_ERROR_RECOVERY_MS,
    );
    expect(at("error", new MockApiError("Too Many Requests", 429))).toBe(
      INBOX_ERROR_RECOVERY_MS,
    );
  });
});
