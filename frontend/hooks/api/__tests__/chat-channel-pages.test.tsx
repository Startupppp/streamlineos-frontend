"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
  getApiErrorCode: () => undefined,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {} }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/observability/error-reporter", () => ({
  reportError: jest.fn(),
}));

const mockedGet = apiClient.get as jest.Mock;
const { reportError } = jest.requireMock("@/lib/observability/error-reporter") as {
  reportError: jest.Mock;
};

function makeWrapper(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  Wrapper.displayName = "TestQueryWrapper";
  return Wrapper;
}

function freshClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function channelRow(id: number) {
  return { id, name: `channel-${id}`, type: "PUBLIC" };
}

function endlessPages() {
  let page = 0;
  return jest.fn(async () => {
    page += 1;
    return { channels: [channelRow(page)], nextCursor: `cursor-${page}` };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("channel discovery — bounded, not drained", () => {
  it("reads exactly ONE page on mount even when 100 pages exist", async () => {
    mockedGet.mockImplementation(endlessPages());
    const { useChatChannels } = await import("@/hooks/api/chat-core-read");
    const { result } = renderHook(() => useChatChannels(), {
      wrapper: makeWrapper(freshClient()),
    });

    await waitFor(() => expect(result.current.channels).toHaveLength(1));
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isTruncated).toBe(false);
  });

  it("the first request carries no cursor and loadMore carries the server's", async () => {
    mockedGet.mockImplementation(endlessPages());
    const { useChatChannels } = await import("@/hooks/api/chat-core-read");
    const { result } = renderHook(() => useChatChannels(), {
      wrapper: makeWrapper(freshClient()),
    });

    await waitFor(() => expect(result.current.channels).toHaveLength(1));
    expect(mockedGet.mock.calls[0]?.[1]).toBeUndefined();

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.channels).toHaveLength(2));
    expect(mockedGet.mock.calls[1]?.[1]).toEqual({ cursor: "cursor-1" });
  });

  it("later channels stay reachable — loadMore keeps appending", async () => {
    mockedGet.mockImplementation(endlessPages());
    const { useChatChannels } = await import("@/hooks/api/chat-core-read");
    const { result } = renderHook(() => useChatChannels(), {
      wrapper: makeWrapper(freshClient()),
    });

    await waitFor(() => expect(result.current.channels).toHaveLength(1));
    for (let i = 0; i < 3; i += 1) {
      act(() => result.current.loadMore());
      await waitFor(() => expect(result.current.channels).toHaveLength(i + 2));
    }
    expect(result.current.channels.map((c) => c.id)).toEqual([1, 2, 3, 4]);
  });

  it("past the 20-page ceiling it reports isTruncated instead of a silent short array", async () => {
    mockedGet.mockImplementation(endlessPages());
    const { useChatChannels, MAX_CHANNEL_PAGES } = await import(
      "@/hooks/api/chat-core-read"
    );
    const { result } = renderHook(() => useChatChannels(), {
      wrapper: makeWrapper(freshClient()),
    });

    await waitFor(() => expect(result.current.channels).toHaveLength(1));
    for (let i = 1; i < MAX_CHANNEL_PAGES; i += 1) {
      act(() => result.current.loadMore());
      await waitFor(() => expect(result.current.channels).toHaveLength(i + 1));
    }

    expect(result.current.channels).toHaveLength(MAX_CHANNEL_PAGES);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.isTruncated).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(MAX_CHANNEL_PAGES));
  });

  it("a repeated cursor ends the sequence and is reported — it never loops", async () => {
    mockedGet
      .mockResolvedValueOnce({ channels: [channelRow(1)], nextCursor: "stuck" })
      .mockResolvedValue({ channels: [channelRow(2)], nextCursor: "stuck" });

    const { useChatChannels } = await import("@/hooks/api/chat-core-read");
    const { result } = renderHook(() => useChatChannels(), {
      wrapper: makeWrapper(freshClient()),
    });

    await waitFor(() => expect(result.current.channels).toHaveLength(1));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.channels).toHaveLength(2));

    expect(result.current.hasMore).toBe(false);
    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(reportError).toHaveBeenCalledTimes(1);
    expect((reportError.mock.calls[0]?.[0] as Error).message).toContain(
      "repeated the cursor",
    );
  });

  it("a failed page surfaces as isError with the error, not as an empty list", async () => {
    mockedGet.mockRejectedValue(new Error("channel list unavailable"));
    const { useChatChannels } = await import("@/hooks/api/chat-core-read");
    const { result } = renderHook(() => useChatChannels(), {
      wrapper: makeWrapper(freshClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("channel list unavailable");
    expect(result.current.channels).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it("warm identical reads coalesce — two consumers share one request", async () => {
    mockedGet.mockImplementation(endlessPages());
    const { useChatChannels } = await import("@/hooks/api/chat-core-read");
    const client = freshClient();
    const wrapper = makeWrapper(client);

    const a = renderHook(() => useChatChannels(), { wrapper });
    const b = renderHook(() => useChatChannels(), { wrapper });

    await waitFor(() => expect(a.result.current.channels).toHaveLength(1));
    await waitFor(() => expect(b.result.current.channels).toHaveLength(1));
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("archived and public lists are paged the same way, from their own routes", async () => {
    mockedGet.mockImplementation(endlessPages());
    const { useArchivedChannels, usePublicChannels } = await import(
      "@/hooks/api/chat-core-read"
    );
    const wrapper = makeWrapper(freshClient());

    const archived = renderHook(() => useArchivedChannels(), { wrapper });
    const publicList = renderHook(() => usePublicChannels(), { wrapper });

    await waitFor(() => expect(archived.result.current.channels).toHaveLength(1));
    await waitFor(() => expect(publicList.result.current.channels).toHaveLength(1));

    const routes = mockedGet.mock.calls.map((call) => call[0]);
    expect(routes).toContain("/chat/channels/archived");
    expect(routes).toContain("/chat/channels/public");
    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(archived.result.current.hasMore).toBe(true);
  });
});
