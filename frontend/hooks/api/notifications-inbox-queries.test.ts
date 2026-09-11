import { renderHook, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { useInfiniteNotifications, useNotifications } from "./notifications-inbox";
import { apiClientMock, wrapper } from "./notifications-inbox-test-fixtures";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1" } },
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    patch: jest.fn().mockResolvedValue({ success: true }),
    post: jest.fn().mockResolvedValue({ success: true }),
    get: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock("./notifications-shared", () => ({
  SHARED_UNREAD_PARAMS: { section: "UNREAD", limit: 20 },
  toStringParams: (p: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(p)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)]),
    ),
  useNotificationInboxInvalidation: jest.fn().mockReturnValue({
    invalidateInbox: jest.fn(),
    orgId: "org-1",
    queryClient: null,
  }),
}));

jest.mock("@/lib/query-request-policies", () => ({
  NOTIFICATION_FALLBACK_INTERVAL_MS: 30_000,
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe("abort-signal propagation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("useNotifications passes signal to apiClient.get", async () => {
    const client = makeClient();
    const apiClient = apiClientMock();
    apiClient.get.mockResolvedValue([]);

    renderHook(() => useNotifications(), { wrapper: wrapper(client) });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(apiClient.get).toHaveBeenCalled();
    const [, , signal] = apiClient.get.mock.calls[0] as [unknown, unknown, unknown];
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("useInfiniteNotifications passes signal to apiClient.get", async () => {
    const client = makeClient();
    const apiClient = apiClientMock();
    apiClient.get.mockResolvedValue([]);

    renderHook(() => useInfiniteNotifications(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(apiClient.get).toHaveBeenCalled();
    const [, , signal] = apiClient.get.mock.calls[0] as [unknown, unknown, unknown];
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
