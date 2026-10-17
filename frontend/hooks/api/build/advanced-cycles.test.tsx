import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useDeleteCycle, useUpdateCycle } from "./cycles";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { Cycle } from "@/types/projects";
import type { CyclePage } from "./cycles";

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
  goal: null,
  capacity: null,
  version: 1,
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

const CYCLE_PAGE: CyclePage = {
  data: [CYCLE],
  pagination: { limit: 25, hasMore: false, nextCursor: null },
};

it("PATCHes the canonical cycle route and merges the response into the rendered list", async () => {
  const updated = {
    ...CYCLE,
    status: "completed" as const,
    updatedAt: "2026-09-25T00:00:00.000Z",
  };
  getApiClient().patch.mockResolvedValue(updated);
  const client = makeClient();
  const queryKey = buildWorkQueryKeys.projects.cycles(42);
  client.setQueryData([...queryKey, {}], CYCLE_PAGE);
  const { result } = renderHook(() => useUpdateCycle(), { wrapper: wrap(client) });

  await act(async () => {
    await result.current.mutateAsync({ projectId: 42, cycleId: 5, version: 1, status: "completed" });
  });

  expect(getApiClient().patch).toHaveBeenCalledWith(
    "/build/42/cycles/5",
    { version: 1, status: "completed" },
    undefined,
    expect.anything(),
  );
  const cached = client.getQueryData<CyclePage>([...queryKey, {}]);
  expect(cached?.data).toEqual([
    expect.objectContaining({ id: 5, status: "completed", totalItems: 6, progress: 50 }),
  ]);
});

it("DELETEs the canonical cycle route and removes the cycle from the rendered list", async () => {
  getApiClient().delete.mockResolvedValue(undefined);
  const client = makeClient();
  const queryKey = buildWorkQueryKeys.projects.cycles(42);
  const twoItemPage: CyclePage = {
    data: [CYCLE, { ...CYCLE, id: 6, name: "Iteration 6" }],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  };
  client.setQueryData([...queryKey, {}], twoItemPage);
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
  const cached = client.getQueryData<CyclePage>([...queryKey, {}]);
  expect(cached?.data?.map((cycle) => cycle.id)).toEqual([6]);
});

it("does not call map on a CyclePage object when updating a cycle — reports t2.map is not a function", async () => {
  const updated = { ...CYCLE, name: "Renamed", version: 2, updatedAt: "2026-09-26T00:00:00.000Z" };
  getApiClient().patch.mockResolvedValue(updated);
  const client = makeClient();
  const queryKey = buildWorkQueryKeys.projects.cycles(42);
  client.setQueryData([...queryKey, {}], CYCLE_PAGE);
  const { result } = renderHook(() => useUpdateCycle(), { wrapper: wrap(client) });

  await act(async () => {
    await result.current.mutateAsync({ projectId: 42, cycleId: 5, version: 1, name: "Renamed" });
  });

  const cached = client.getQueryData<CyclePage>([...queryKey, {}]);
  expect(cached?.data?.[0]?.name).toBe("Renamed");
});
