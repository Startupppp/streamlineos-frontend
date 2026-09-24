import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { usePrograms } from "./programs";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(apiClient.get).mockResolvedValue({
    data: [],
    pagination: { limit: 25, nextCursor: null, hasMore: false },
  });
});

it("wires every supported Programs list input to GET /build/programs", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  renderHook(
    () =>
      usePrograms({
        cursor: "next-page",
        limit: 25,
        q: "launch",
        ownerId: "user-2",
        health: "at_risk",
        status: "on_hold",
        portfolioId: 7,
        projectId: 9,
        sort: "name",
        order: "asc",
      }),
    { wrapper: createWrapper(client) },
  );

  await waitFor(() => expect(jest.mocked(apiClient.get)).toHaveBeenCalled());

  expect(jest.mocked(apiClient.get)).toHaveBeenCalledWith(
    "/build/programs",
    {
      cursor: "next-page",
      limit: "25",
      q: "launch",
      ownerId: "user-2",
      health: "at_risk",
      status: "on_hold",
      portfolioId: "7",
      projectId: "9",
      sort: "name",
      order: "asc",
    },
    expect.any(AbortSignal),
    expect.anything(),
  );

  client.clear();
});
