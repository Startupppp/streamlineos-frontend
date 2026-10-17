import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({ results: [] }),
    delete: jest.fn().mockResolvedValue({ results: [], purgedCount: 0 }),
    get: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useAccess: jest.fn(() => ({ data: { permissions: [] }, refetch: jest.fn() })),
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn(() => undefined),
}));

import { apiClient } from "@/lib/api-client";
import {
  useKbBulkRestorePages,
  useKbBulkPurgePages,
} from "@/hooks/api/kb/pages";
import { useBulkDecidePageReviews } from "@/hooks/api/kb/page-reviews";

const post = apiClient.post as jest.Mock;
const del = apiClient.delete as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function keyFromCall(call: unknown[]): string | undefined {
  const config = call[2] as { headers?: Record<string, string> } | undefined;
  return config?.headers?.[IDEMPOTENCY_HEADER];
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("KB bulk commands hold one idempotency key across a retry", () => {
  it("bulk decide retried after a failed attempt reuses the first key so the server replays", async () => {
    post.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useBulkDecidePageReviews(), { wrapper });
    const input = { ids: [1, 2], decision: "approved" as const };

    await act(async () => {
      result.current.mutate(input);
    });
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const firstKey = keyFromCall(post.mock.calls[0]);

    await act(async () => {
      result.current.mutate(input);
    });
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));

    expect(firstKey).toBeDefined();
    expect(keyFromCall(post.mock.calls[1])).toBe(firstKey);
  });

  it("bulk decide starts a new operation after a success, so a later deliberate re-run is not swallowed as a replay", async () => {
    const { result } = renderHook(() => useBulkDecidePageReviews(), { wrapper });
    const input = { ids: [1, 2], decision: "approved" as const };

    await act(async () => {
      result.current.mutate(input);
    });
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.mutate(input);
    });
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));

    expect(keyFromCall(post.mock.calls[1])).not.toBe(
      keyFromCall(post.mock.calls[0]),
    );
  });

  it("bulk decide over a different selection mints a new key, so the reuse above is scoped", async () => {
    const { result } = renderHook(() => useBulkDecidePageReviews(), { wrapper });

    await act(async () => {
      result.current.mutate({ ids: [1], decision: "approved" as const });
    });
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.mutate({ ids: [99], decision: "approved" as const });
    });
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));

    expect(keyFromCall(post.mock.calls[1])).not.toBe(
      keyFromCall(post.mock.calls[0]),
    );
  });

  it("bulk restore retried after a failed attempt reuses the first key", async () => {
    post.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useKbBulkRestorePages(), { wrapper });

    await act(async () => {
      result.current.mutate([5, 6]);
    });
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.mutate([5, 6]);
    });
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));

    expect(keyFromCall(post.mock.calls[0])).toBeDefined();
    expect(keyFromCall(post.mock.calls[1])).toBe(keyFromCall(post.mock.calls[0]));
  });

  it("bulk purge retried after a failed attempt reuses the first key, so a replayed purge cannot delete twice", async () => {
    del.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useKbBulkPurgePages(), { wrapper });

    await act(async () => {
      result.current.mutate([5, 6]);
    });
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.mutate([5, 6]);
    });
    await waitFor(() => expect(del).toHaveBeenCalledTimes(2));

    expect(keyFromCall(del.mock.calls[0])).toBeDefined();
    expect(keyFromCall(del.mock.calls[1])).toBe(keyFromCall(del.mock.calls[0]));
  });
});
