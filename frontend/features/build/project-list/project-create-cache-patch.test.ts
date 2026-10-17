import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useCreateProject } from "@/hooks/api/build/projects";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { ProjectListResponse } from "@/types/projects";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({
      id: 99,
      orgId: "org-1",
      name: "Immediate Project",
      description: "desc",
      key: "IP",
      managedProductId: null,
      startDate: null,
      endDate: null,
      status: "ACTIVE",
      settings: null,
      managerId: null,
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

function makeListResponse(overrides?: Partial<ProjectListResponse>): ProjectListResponse {
  return {
    data: [],
    hasMore: false,
    nextCursor: null,
    ...overrides,
  };
}

describe("useCreateProject — immediate cache patch (NEW-04)", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
  });

  it("prepends the created project to the list cache so it is visible without a network refetch", async () => {
    const listKey = buildWorkQueryKeys.projects.list();
    client.setQueryData<ProjectListResponse>(listKey, makeListResponse());

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "Immediate Project", key: "IP" });
    });

    const cached = client.getQueryData<ProjectListResponse>(listKey);
    expect(cached?.data).toHaveLength(1);
    expect(cached?.data[0].id).toBe(99);
    expect(cached?.data[0].name).toBe("Immediate Project");
    expect(cached?.data[0].key).toBe("IP");
    expect(cached?.data[0].health).toBe("on_track");
    expect(cached?.data[0].progress).toEqual({ total: 0, done: 0, percentage: 0 });
  });

  it("prepends to a non-empty list so the new project appears at the top", async () => {
    const listKey = buildWorkQueryKeys.projects.list();
    const existing = {
      id: 1,
      name: "Existing",
      description: null,
      key: "EX",
      status: "ACTIVE" as const,
      priority: null,
      health: "on_track" as const,
      managedProductId: null,
      startDate: null,
      endDate: null,
      manager: null,
      progress: { total: 0, done: 0, percentage: 0 },
      members: [],
      teams: [],
    };
    client.setQueryData<ProjectListResponse>(listKey, makeListResponse({ data: [existing] }));

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "Immediate Project", key: "IP" });
    });

    const cached = client.getQueryData<ProjectListResponse>(listKey);
    expect(cached?.data).toHaveLength(2);
    expect(cached?.data[0].id).toBe(99);
    expect(cached?.data[1].id).toBe(1);
  });

  it("patches all active list queries regardless of filters so filtered views also update", async () => {
    const filteredKey = buildWorkQueryKeys.projects.list({ search: "imm" });
    client.setQueryData<ProjectListResponse>(filteredKey, makeListResponse());

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "Immediate Project", key: "IP" });
    });

    const cached = client.getQueryData<ProjectListResponse>(filteredKey);
    expect(cached?.data).toHaveLength(1);
    expect(cached?.data[0].id).toBe(99);
  });

  it("does not call invalidateQueries for the list after the cache patch (FE-133)", async () => {
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const listKeyStr = JSON.stringify(buildWorkQueryKeys.projects.list());

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "Immediate Project", key: "IP" });
    });

    const listInvalidations = invalidateSpy.mock.calls.filter((call) => {
      const opts = call[0] as { queryKey?: unknown };
      return JSON.stringify(opts.queryKey) === listKeyStr;
    });
    expect(listInvalidations).toHaveLength(0);
  });
});
