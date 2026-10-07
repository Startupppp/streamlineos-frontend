import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useCreateProject } from "./projects";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({
      id: 42,
      orgId: "org-1",
      name: "Smoke Project",
      description: null,
      key: "SP",
      managedProductId: null,
      startDate: null,
      endDate: null,
      status: "ACTIVE",
      settings: null,
    }),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({
    data: {
      isOrgOwner: false,
      scopes: { "build:create": "all" },
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

describe("useCreateProject — list invalidation after create", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("invalidates the projects list with refetchType all so an empty list cache refreshes after navigate-away create", async () => {
    const { result } = renderHook(() => useCreateProject(), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "Smoke Project", key: "SP" });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: buildWorkQueryKeys.projects.list(),
        refetchType: "all",
      }),
    );
  });

  it("does not rely on default active-only invalidation of projects.all for the list refresh", async () => {
    const { result } = renderHook(() => useCreateProject(), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "Smoke Project 2", key: "SP2" });
    });

    const listKey = JSON.stringify(buildWorkQueryKeys.projects.list());
    const activeOnlyListCalls = invalidateSpy.mock.calls.filter((call) => {
      const opts = call[0] as { queryKey?: unknown; refetchType?: string };
      return (
        JSON.stringify(opts.queryKey) === listKey &&
        (opts.refetchType === undefined || opts.refetchType === "active")
      );
    });
    expect(activeOnlyListCalls).toHaveLength(0);
  });
});
