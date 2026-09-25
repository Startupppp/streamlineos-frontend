import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useDeleteCycle, useUpdateCycle } from "./advanced";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { Cycle } from "@/types/projects";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({
    data: {
      isOrgOwner: false,
      scopes: { "build:cycles:manage": "all" },
      modules: {},
    },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (factory: () => unknown) => factory,
}));

type ApiMock = {
  patch: jest.Mock;
  delete: jest.Mock;
};

const CYCLE: Cycle = {
  id: 5,
  orgId: "org-1",
  projectId: 42,
  name: "Iteration 5",
  description: null,
  status: "active",
  startDate: "2026-09-01",
  endDate: "2026-09-14",
  createdBy: "user-1",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  totalItems: 6,
  completedItems: 3,
  progress: 50,
};

function getApiClient(): ApiMock {
  return (jest.requireMock("@/lib/api-client") as { apiClient: ApiMock }).apiClient;
}

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it("PATCHes the canonical cycle route and merges the response into the rendered list", async () => {
  const updated = {
    ...CYCLE,
    status: "completed" as const,
    updatedAt: "2026-09-25T00:00:00.000Z",
  };
  getApiClient().patch.mockResolvedValue(updated);
  const client = makeClient();
  const queryKey = buildWorkQueryKeys.projects.cycles(42);
  client.setQueryData(queryKey, [CYCLE]);
  const { result } = renderHook(() => useUpdateCycle(), { wrapper: wrap(client) });

  await act(async () => {
    await result.current.mutateAsync({ projectId: 42, cycleId: 5, status: "completed" });
  });

  expect(getApiClient().patch).toHaveBeenCalledWith(
    "/build/42/cycles/5",
    { status: "completed" },
    undefined,
    expect.anything(),
  );
  expect(client.getQueryData<Cycle[]>(queryKey)).toEqual([
    expect.objectContaining({ id: 5, status: "completed", totalItems: 6, progress: 50 }),
  ]);
});

it("DELETEs the canonical cycle route and removes the cycle from the rendered list", async () => {
  getApiClient().delete.mockResolvedValue(undefined);
  const client = makeClient();
  const queryKey = buildWorkQueryKeys.projects.cycles(42);
  client.setQueryData(queryKey, [CYCLE, { ...CYCLE, id: 6, name: "Iteration 6" }]);
  const { result } = renderHook(() => useDeleteCycle(), { wrapper: wrap(client) });

  await act(async () => {
    await result.current.mutateAsync({ projectId: 42, cycleId: 5 });
  });

  expect(getApiClient().delete).toHaveBeenCalledWith(
    "/build/42/cycles/5",
    undefined,
    undefined,
    expect.anything(),
  );
  expect(client.getQueryData<Cycle[]>(queryKey)?.map((cycle) => cycle.id)).toEqual([6]);
});
