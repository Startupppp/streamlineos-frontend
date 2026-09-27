"use client";

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useUpdateProject } from "./projects";
import type { ProjectWithDetails, ProjectListResponse } from "@/types/projects";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    patch: jest.fn().mockResolvedValue({
      id: 42,
      orgId: "org-abc",
      name: "New Name",
      description: null,
      key: "NP",
      managedProductId: null,
      startDate: null,
      endDate: null,
      status: "ACTIVE",
      settings: null,
    }),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({
    data: {
      isOrgOwner: false,
      scopes: { "build:update": "all" },
      modules: {},
    },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (fn: () => unknown) => fn,
}));

jest.mock("@/features/build/project-detail/project-hydration-context", () => ({
  useHydratedProject: jest.fn().mockReturnValue(undefined),
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

describe("useUpdateProject — invalidation scope (ticket 20)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
  });

  it("does not invalidate buildWorkQueryKeys.projects.all after a project rename", async () => {
    const { result } = renderHook(() => useUpdateProject(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 42, name: "New Name" });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const allProjectsKey = JSON.stringify(buildWorkQueryKeys.projects.all);
    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey?: unknown }).queryKey),
    );

    expect(invalidatedKeys).not.toContain(allProjectsKey);
  });

  it("still invalidates project detail and members after a rename", async () => {
    const { result } = renderHook(() => useUpdateProject(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 42, name: "New Name" });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey?: unknown }).queryKey),
    );

    expect(keys).toContain(JSON.stringify(buildWorkQueryKeys.projects.detail(42)));
    expect(keys).toContain(JSON.stringify(buildWorkQueryKeys.projects.members(42)));
  });

  it("does not invalidate any ticket collection after a project rename", async () => {
    const { result } = renderHook(() => useUpdateProject(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 42, name: "New Name" });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const ticketsKey = JSON.stringify(buildWorkQueryKeys.projects.tickets({ projectId: 42 }));
    const allWorkKey = JSON.stringify(buildWorkQueryKeys.projects.allWorkAll);
    const columnCountsKey = JSON.stringify(buildWorkQueryKeys.projects.columnCounts(42));

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey?: unknown }).queryKey),
    );

    expect(invalidatedKeys).not.toContain(ticketsKey);
    expect(invalidatedKeys).not.toContain(allWorkKey);
    expect(invalidatedKeys).not.toContain(columnCountsKey);
  });

  it("invalidates the project list so the renamed name appears in list views immediately", async () => {
    const { result } = renderHook(() => useUpdateProject(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 42, name: "New Name" });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const keys = invalidateSpy.mock.calls.map(
      (c) => JSON.stringify((c[0] as { queryKey?: unknown }).queryKey),
    );

    expect(keys).toContain(JSON.stringify(buildWorkQueryKeys.projects.list()));
  });

  it("patches the project detail cache optimistically with the new name before the server responds", async () => {
    const seedDetail: ProjectWithDetails = {
      id: 42,
      orgId: "org-abc",
      name: "Old Name",
      description: null,
      key: "PROJ",
      managedProductId: null,
      startDate: null,
      endDate: null,
      status: "ACTIVE",
      settings: null,
    };
    const detailKey = buildWorkQueryKeys.projects.detail(42);
    client.setQueryData(detailKey, seedDetail);

    const { result } = renderHook(() => useUpdateProject(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 42, name: "New Name" });
    });

    const cached = client.getQueryData<ProjectWithDetails>(detailKey);
    expect(cached?.name).toBe("New Name");
  });

  it("patches the project list cache optimistically so the renamed name appears without a full refetch", async () => {
    const seedList: ProjectListResponse = {
      data: [
        {
          id: 42,
          name: "Old Name",
          description: null,
          key: "PROJ",
          status: "ACTIVE",
          priority: null,
          health: "on_track",
          managedProductId: null,
          startDate: null,
          endDate: null,
          manager: null,
          progress: { total: 0, done: 0, percentage: 0 },
          members: [],
          teams: [],
        },
      ],
      hasMore: false,
      nextCursor: null,
    };
    const listKey = buildWorkQueryKeys.projects.list();
    client.setQueryData(listKey, seedList);

    const { result } = renderHook(() => useUpdateProject(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 42, name: "New Name" });
    });

    const cached = client.getQueryData<ProjectListResponse>(listKey);
    expect(cached?.data[0].name).toBe("New Name");
  });
});
