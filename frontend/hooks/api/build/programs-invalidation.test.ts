import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useCreateProgram, useDeleteProgram } from "./programs";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { ProgramsPage } from "@/types/projects";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn(),
    delete: jest.fn(),
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

import { apiClient } from "@/lib/api-client";

const CREATED_PROGRAM = {
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
};

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

const EXISTING_PAGE: ProgramsPage = {
  data: [
    {
      id: 10,
      orgId: "org-1",
      name: "Existing Program",
      description: null,
      portfolioId: null,
      ownerId: null,
      status: "active",
      health: null,
      createdBy: "user-1",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      deletedAt: null,
      projectCount: 0,
    },
  ],
  pagination: { hasMore: false, nextCursor: null },
};

describe("useCreateProgram — B-075: new program appears in the list without reload", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.post as jest.Mock).mockResolvedValue(CREATED_PROGRAM);
    client = makeClient();
  });

  it("prepends the new program to every cached programs list so it appears immediately without a refetch", async () => {
    const listKey = buildWorkQueryKeys.projects.programs.list();
    client.setQueryData(listKey, EXISTING_PAGE);

    const { result } = renderHook(() => useCreateProgram(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ name: "Alpha Program" });
    });

    const cached = client.getQueryData<ProgramsPage>(listKey);
    expect(cached?.data[0]).toMatchObject({ id: 5, name: "Alpha Program" });
    expect(cached?.data[1]).toMatchObject({ id: 10, name: "Existing Program" });
  });

  it("patches filtered list variants under the programs prefix so all active list caches update at once", async () => {
    const filteredKey = buildWorkQueryKeys.projects.programs.list({ limit: "25" });
    client.setQueryData(filteredKey, EXISTING_PAGE);

    const { result } = renderHook(() => useCreateProgram(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ name: "Beta Program" });
    });

    const cached = client.getQueryData<ProgramsPage>(filteredKey);
    expect(cached?.data[0]).toMatchObject({ id: 5, name: "Alpha Program" });
  });
});

describe("useDeleteProgram — B-075: deleted program disappears from the list without reload", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.delete as jest.Mock).mockResolvedValue(undefined);
    client = makeClient();
  });

  it("removes the deleted program from every cached programs list by id", async () => {
    const listKey = buildWorkQueryKeys.projects.programs.list();
    client.setQueryData(listKey, EXISTING_PAGE);

    const { result } = renderHook(() => useDeleteProgram(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync(10);
    });

    const cached = client.getQueryData<ProgramsPage>(listKey);
    expect(cached?.data).toHaveLength(0);
  });

  it("removes the deleted program from filtered list variants as well", async () => {
    const filteredKey = buildWorkQueryKeys.projects.programs.list({ limit: "25" });
    client.setQueryData(filteredKey, EXISTING_PAGE);

    const { result } = renderHook(() => useDeleteProgram(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync(10);
    });

    const cached = client.getQueryData<ProgramsPage>(filteredKey);
    expect(cached?.data.find((p) => p.id === 10)).toBeUndefined();
  });
});
