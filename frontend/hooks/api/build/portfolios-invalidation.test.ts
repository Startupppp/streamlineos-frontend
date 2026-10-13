import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useCreatePortfolio, useDeletePortfolio } from "./portfolios";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { PortfoliosPage } from "@/types/projects";

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
      scopes: { "build:portfolios:manage": "all" },
      modules: {},
    },
    refetch: jest.fn(),
  })),
  useCan: jest.fn().mockReturnValue(true),
}));

import { apiClient } from "@/lib/api-client";

const CREATED_PORTFOLIO = {
  id: 5,
  orgId: "org-1",
  name: "Alpha Portfolio",
  description: null,
  ownerId: null,
  status: "active",
  health: null,
  strategicGoal: null,
  createdBy: "user-1",
  createdAt: "2026-09-19T10:00:00.000Z",
  updatedAt: "2026-09-19T10:00:00.000Z",
  deletedAt: null,
  projectCount: 0,
  programCount: 0,
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

const EXISTING_PAGE: PortfoliosPage = {
  data: [
    {
      id: 10,
      orgId: "org-1",
      name: "Existing Portfolio",
      description: null,
      ownerId: null,
      status: "active",
      health: null,
      strategicGoal: null,
      createdBy: "user-1",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      deletedAt: null,
      projectCount: 0,
      programCount: 0,
    },
  ],
  pagination: { hasMore: false, nextCursor: null },
};

describe("useCreatePortfolio — B-075: new portfolio appears in the list without reload", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.post as jest.Mock).mockResolvedValue(CREATED_PORTFOLIO);
    client = makeClient();
  });

  it("prepends the new portfolio to every cached portfolios list so it appears immediately without a refetch", async () => {
    const listKey = buildWorkQueryKeys.projects.portfolios.list();
    client.setQueryData(listKey, EXISTING_PAGE);

    const { result } = renderHook(() => useCreatePortfolio(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ name: "Alpha Portfolio" });
    });

    const cached = client.getQueryData<PortfoliosPage>(listKey);
    expect(cached?.data[0]).toMatchObject({ id: 5, name: "Alpha Portfolio" });
    expect(cached?.data[1]).toMatchObject({ id: 10, name: "Existing Portfolio" });
  });

  it("patches filtered list variants under the portfolios prefix so all active list caches update at once", async () => {
    const filteredKey = buildWorkQueryKeys.projects.portfolios.list({ limit: "20" });
    client.setQueryData(filteredKey, EXISTING_PAGE);

    const { result } = renderHook(() => useCreatePortfolio(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ name: "Beta Portfolio" });
    });

    const cached = client.getQueryData<PortfoliosPage>(filteredKey);
    expect(cached?.data[0]).toMatchObject({ id: 5, name: "Alpha Portfolio" });
  });
});

describe("useDeletePortfolio — B-075: deleted portfolio disappears from the list without reload", () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.delete as jest.Mock).mockResolvedValue(undefined);
    client = makeClient();
  });

  it("removes the deleted portfolio from every cached portfolios list by id", async () => {
    const listKey = buildWorkQueryKeys.projects.portfolios.list();
    client.setQueryData(listKey, EXISTING_PAGE);

    const { result } = renderHook(() => useDeletePortfolio(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync(10);
    });

    const cached = client.getQueryData<PortfoliosPage>(listKey);
    expect(cached?.data).toHaveLength(0);
  });

  it("removes the deleted portfolio from filtered list variants as well", async () => {
    const filteredKey = buildWorkQueryKeys.projects.portfolios.list({ limit: "20" });
    client.setQueryData(filteredKey, EXISTING_PAGE);

    const { result } = renderHook(() => useDeletePortfolio(), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync(10);
    });

    const cached = client.getQueryData<PortfoliosPage>(filteredKey);
    expect(cached?.data.find((p) => p.id === 10)).toBeUndefined();
  });
});
