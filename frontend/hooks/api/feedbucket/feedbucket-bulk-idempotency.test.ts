import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { RequestConfig } from "@/lib/api-client";
import type { BulkFeedbucketSubmissionsInput } from "@/types/feedbucket";

jest.mock("@/lib/dom-mutation-guard", () => ({}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({
    data: { isOrgOwner: true, scopes: {}, modules: {} },
    refetch: jest.fn().mockResolvedValue({ data: { isOrgOwner: true } }),
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn() },
  isApiError: () => false,
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { post: jest.Mock };
};

import { useBulkMutateFeedbucketSubmissions } from "./use-feedbucket-submissions";

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

const INPUT: BulkFeedbucketSubmissionsInput = {
  submissionIds: [1, 2],
  action: { type: "status", status: "resolved" },
  filters: { widgetId: 7 },
};

function resultOf(overrides: Partial<{ succeeded: number; skipped: number }> = {}) {
  return {
    requested: 2,
    succeeded: overrides.succeeded ?? 2,
    skipped: overrides.skipped ?? 0,
    results: [
      { submissionId: 1, outcome: "updated", reason: null },
      { submissionId: 2, outcome: "updated", reason: null },
    ],
  };
}

function keysSent(): string[] {
  return apiClient.post.mock.calls.map((call) => {
    const config = call[2] as RequestConfig | undefined;
    return config?.headers?.["Idempotency-Key"] ?? "";
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useBulkMutateFeedbucketSubmissions — retry safety", () => {
  it("posts to the bulk route with the submission ids, action and the caller's list filters", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    apiClient.post.mockResolvedValue(resultOf());
    const { result } = renderHook(() => useBulkMutateFeedbucketSubmissions(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(INPUT);
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/feedbucket/submissions/bulk",
      INPUT,
      expect.anything(),
      expect.anything(),
    );
  });

  it("sends an Idempotency-Key header, without which the fenced route 400s every call", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    apiClient.post.mockResolvedValue(resultOf());
    const { result } = renderHook(() => useBulkMutateFeedbucketSubmissions(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(INPUT);
    });

    expect(keysSent()[0]).toEqual(expect.any(String));
    expect(keysSent()[0]).not.toBe("");
  });

  it("reuses one key across a retry of the same bulk, so the backend replays instead of applying twice", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    apiClient.post.mockRejectedValueOnce(new Error("network"));
    apiClient.post.mockResolvedValue(resultOf());
    const { result } = renderHook(() => useBulkMutateFeedbucketSubmissions(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(INPUT).catch(() => undefined);
    });
    await act(async () => {
      await result.current.mutateAsync(INPUT);
    });

    const keys = keysSent();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it("mints a fresh key once the operation has settled, so a second deliberate bulk is not swallowed as a replay", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    apiClient.post.mockResolvedValue(resultOf());
    const { result } = renderHook(() => useBulkMutateFeedbucketSubmissions(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(INPUT);
    });
    await act(async () => {
      await result.current.mutateAsync(INPUT);
    });

    const keys = keysSent();
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("mints a different key for a different selection, because that is a different operation", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    apiClient.post.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useBulkMutateFeedbucketSubmissions(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(INPUT).catch(() => undefined);
    });
    await act(async () => {
      await result.current
        .mutateAsync({ ...INPUT, submissionIds: [3] })
        .catch(() => undefined);
    });

    const keys = keysSent();
    expect(keys[0]).not.toBe(keys[1]);
  });
});

describe("useBulkMutateFeedbucketSubmissions — cache reconciliation", () => {
  it("invalidates the feedbucket namespace so the list reflects the bulk write", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    client.setQueryData(growthAndSignQueryKeys.feedbucket.all, []);
    apiClient.post.mockResolvedValue(resultOf());
    const { result } = renderHook(() => useBulkMutateFeedbucketSubmissions(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(INPUT);
    });

    await waitFor(() => {
      expect(
        client.getQueryState(growthAndSignQueryKeys.feedbucket.all)?.isInvalidated,
      ).toBe(true);
    });
  });

  it("drops the detail cache of every mutated submission but keeps a skipped one", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    client.setQueryData(growthAndSignQueryKeys.feedbucket.submission(1), { id: 1 });
    client.setQueryData(growthAndSignQueryKeys.feedbucket.submission(2), { id: 2 });
    apiClient.post.mockResolvedValue({
      requested: 2,
      succeeded: 1,
      skipped: 1,
      results: [
        { submissionId: 1, outcome: "updated", reason: null },
        { submissionId: 2, outcome: "skipped", reason: "not_found_or_filtered" },
      ],
    });
    const { result } = renderHook(() => useBulkMutateFeedbucketSubmissions(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(INPUT);
    });

    expect(client.getQueryData(growthAndSignQueryKeys.feedbucket.submission(1))).toBeUndefined();
    expect(client.getQueryData(growthAndSignQueryKeys.feedbucket.submission(2))).toEqual({ id: 2 });
  });
});
