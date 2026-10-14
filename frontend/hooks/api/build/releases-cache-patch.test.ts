import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import type { Release } from "@/types/projects";

jest.mock("@/lib/dom-mutation-guard", () => ({}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useCanState: jest.fn().mockReturnValue("allowed"),
  useAccess: jest.fn(() => ({
    data: { isOrgOwner: true, scopes: { "build:manage": "all" }, modules: {} },
    refetch: jest.fn(),
  })),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    post: jest.fn(),
  },
  isApiError: () => false,
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock; patch: jest.Mock; delete: jest.Mock; post: jest.Mock };
};

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

function makeRelease(overrides: Partial<Release> = {}): Release {
  return {
    id: 1,
    projectId: 7,
    name: "R4 release",
    version: "1.0.0",
    rowVersion: 1,
    description: null,
    status: "draft",
    releaseDate: null,
    publishedAt: null,
    readiness: null,
    riskLevel: null,
    ticketCount: 0,
    createdBy: null,
    createdByUser: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const PAGE_META = { limit: 25, hasMore: false, nextCursor: null };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("release list cache stays truthful after a row mutation, so the table needs no reload", () => {
  const LIST_QUERY = { cursor: undefined, status: undefined, q: undefined, from: undefined, to: undefined };

  it("delete removes the row from every loaded page of the releases list", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    apiClient.get.mockResolvedValue({
      data: [makeRelease({ id: 1 }), makeRelease({ id: 2, name: "R5 release" })],
      pagination: PAGE_META,
    });
    apiClient.delete.mockResolvedValue(undefined);

    const { useReleases, useDeleteRelease } = await import("./releases");
    const { result } = renderHook(
      () => ({ list: useReleases(7, LIST_QUERY), remove: useDeleteRelease(7) }),
      { wrapper: wrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.list.data?.data.map((r) => r.id)).toEqual([1, 2]);
    });

    await act(async () => {
      await result.current.remove.mutateAsync(1);
    });

    await waitFor(() => {
      expect(result.current.list.data?.data.map((r) => r.id)).toEqual([2]);
    });
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it("create prepends the created row and update patches it in place", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    apiClient.get.mockResolvedValue({ data: [makeRelease({ id: 1 })], pagination: PAGE_META });
    apiClient.post.mockResolvedValue(makeRelease({ id: 9, name: "RC release" }));
    apiClient.patch.mockResolvedValue(makeRelease({ id: 1, name: "Renamed" }));

    const { useReleases, useCreateRelease, useUpdateRelease } = await import("./releases");
    const { result } = renderHook(
      () => ({
        list: useReleases(7, LIST_QUERY),
        create: useCreateRelease(7),
        update: useUpdateRelease(7),
      }),
      { wrapper: wrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.list.data?.data.map((r) => r.id)).toEqual([1]);
    });

    await act(async () => {
      await result.current.create.mutateAsync({ name: "RC release", version: "2.0.0" });
    });

    await waitFor(() => {
      expect(result.current.list.data?.data.map((r) => r.id)).toEqual([9, 1]);
    });

    await act(async () => {
      await result.current.update.mutateAsync({ releaseId: 1, rowVersion: 1, name: "Renamed" });
    });

    await waitFor(() => {
      expect(result.current.list.data?.data.find((r) => r.id === 1)?.name).toBe("Renamed");
    });
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
