import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useCreateProgram } from "./programs";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({
      id: 5,
      orgId: "org-1",
      name: "Alpha Program",
      description: null,
      portfolioId: null,
      ownerId: null,
      status: "active",
      health: null,
      createdBy: "user-1",
      createdAt: "2026-09-19T10:00:00.000Z",
      updatedAt: "2026-09-19T10:00:00.000Z",
      deletedAt: null,
      projectCount: 0,
    }),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({
    data: {
      isOrgOwner: false,
      scopes: { "build:programs:manage": "all" },
      modules: {},
    },
    refetch: jest.fn(),
  })),
  useCan: jest.fn().mockReturnValue(true),
}));

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(client: QueryClient) {
  return function Wrap({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe("useCreateProgram — BUG-055: list is invalidated with refetchType all so the stale cache is discarded even when the observer is temporarily inactive", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("calls invalidateQueries with refetchType all after create so a program added while the list was unmounted appears on remount without a manual reload", async () => {
    const { result } = renderHook(() => useCreateProgram(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ name: "Alpha Program" });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.programs.list(),
        refetchType: "all",
      }),
    );
  });

  it("invalidates the no-params programs list key so all filtered variants under that prefix are also refetched", async () => {
    const { result } = renderHook(() => useCreateProgram(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ name: "Beta Program" });
    });

    const programListKey = JSON.stringify(buildWorkQueryKeys.projects.programs.list());
    const matchingCalls = invalidateSpy.mock.calls.filter((call) => {
      const opts = call[0] as { queryKey?: unknown };
      return JSON.stringify(opts.queryKey) === programListKey;
    });
    expect(matchingCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("does not invalidate the programs list with the default refetchType so only inactive observers are covered by the explicit all override", async () => {
    const { result } = renderHook(() => useCreateProgram(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ name: "Gamma Program" });
    });

    const programListKey = JSON.stringify(buildWorkQueryKeys.projects.programs.list());
    const defaultRefetchCalls = invalidateSpy.mock.calls.filter((call) => {
      const opts = call[0] as { queryKey?: unknown; refetchType?: string };
      return (
        JSON.stringify(opts.queryKey) === programListKey &&
        (opts.refetchType === undefined || opts.refetchType === "active")
      );
    });
    expect(defaultRefetchCalls).toHaveLength(0);
  });
});
