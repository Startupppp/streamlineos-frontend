import { renderHook, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { useUnifiedInbox } from "./inbox";
import { apiClientMock, wrapper } from "./notifications-inbox-test-fixtures";

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
