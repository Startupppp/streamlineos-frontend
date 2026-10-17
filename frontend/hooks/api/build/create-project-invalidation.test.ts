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

describe("useCreateProject — the list cache carries the new project without a refetch", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("prepends the created project to a seeded list cache, so the list shows it before any network round-trip", async () => {
    client.setQueryData(buildWorkQueryKeys.projects.list(undefined), {
      data: [{ id: 7, name: "Existing project", key: "EX" }],
      total: 1,
    });

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "Smoke Project", key: "SP" });
    });

    const list = client.getQueryData<{
      data: { id: number; name: string; key: string }[];
    }>(buildWorkQueryKeys.projects.list(undefined));

    expect(list?.data.map((p) => p.id)).toEqual([42, 7]);
    expect(list?.data[0]).toEqual(
      expect.objectContaining({ id: 42, name: "Smoke Project", key: "SP" }),
    );
  });

  it("never invalidates or refetches the projects list, because the create response already carries the new row", async () => {
    const { result } = renderHook(() => useCreateProject(), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "Smoke Project 2", key: "SP2" });
    });

    const listKey = JSON.stringify(buildWorkQueryKeys.projects.list());
    const listInvalidations = invalidateSpy.mock.calls.filter((call) => {
      const opts = call[0] as { queryKey?: unknown };
      return JSON.stringify(opts.queryKey) === listKey;
    });
    expect(listInvalidations).toHaveLength(0);
  });
});
