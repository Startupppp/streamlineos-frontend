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

describe("useInfiniteNotifications — category param wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forwards category to apiClient.get when provided", async () => {
    const client = makeClient();
    const apiClient = apiClientMock();
    apiClient.get.mockResolvedValue([]);

    renderHook(() => useInfiniteNotifications({ category: "PROJECTS" }), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(apiClient.get).toHaveBeenCalled();
    const [, params] = apiClient.get.mock.calls[0] as [unknown, Record<string, string>];
    expect(params).toMatchObject({ category: "PROJECTS" });
  });

  it("does not include category in the request when not provided", async () => {
    const client = makeClient();
    const apiClient = apiClientMock();
    apiClient.get.mockResolvedValue([]);

    renderHook(() => useInfiniteNotifications({ limit: 10 }), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(apiClient.get).toHaveBeenCalled();
    const [, params] = apiClient.get.mock.calls[0] as [unknown, Record<string, string>];
    expect(params).not.toHaveProperty("category");
  });

  it("query key differs when category changes so two filters cannot share a cache entry", () => {
    const { platformCoreQueryKeys } = require("@/lib/query-keys/platform-core");
    const keyProjects = platformCoreQueryKeys.notifications.list({
      category: "PROJECTS",
      sourceModule: "build",
      infinite: true,
    });
    const keyBilling = platformCoreQueryKeys.notifications.list({
      category: "BILLING",
      sourceModule: "build",
      infinite: true,
    });
    expect(keyProjects).not.toEqual(keyBilling);
  });

  it("query key includes category when set", async () => {
    const { platformCoreQueryKeys } = await import("@/lib/query-keys/platform-core");
    const keyWithCategory = platformCoreQueryKeys.notifications.list({
      category: "PROJECTS",
      infinite: true,
    });
    const keyWithoutCategory = platformCoreQueryKeys.notifications.list({
      infinite: true,
    });
    expect(keyWithCategory).not.toEqual(keyWithoutCategory);
    const keyOtherCategory = platformCoreQueryKeys.notifications.list({
      category: "BILLING",
      infinite: true,
    });
    expect(keyWithCategory).not.toEqual(keyOtherCategory);
  });

  it("existing callers without category behave as before — no category key in params", async () => {
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
    const [url, params] = apiClient.get.mock.calls[0] as [string, Record<string, string>];
    expect(url).toBe("/notifications");
    expect(params).not.toHaveProperty("category");
  });
});
