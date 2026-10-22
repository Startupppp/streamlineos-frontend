import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useExpensePageData } from "@/hooks/api/hr/expenses";


jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockedGet = apiClient.get as jest.Mock;

const SELF_URL = "/me/expenses";
const ORG_URL = "/hr/expenses/page-data";

const STABLE_FILTERS = {
  page: 1,
  pageSize: 5,
  sortBy: "date",
  sortOrder: "desc" as const,
};

function payload(isAdmin: boolean) {
  return {
    expenses: [],
    pendingExpenses: [],
    stats: null,
    categories: [],
    pagination: { page: 1, pageSize: 5, total: 0, totalPages: 0 },
    isAdmin,
  };
}

function makeWrapper(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  Wrapper.displayName = "TestQueryWrapper";
  return Wrapper;
}

function freshClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockImplementation((url: string) =>
    Promise.resolve(payload(url === ORG_URL)),
  );
});

function requestedUrls(): string[] {
  return mockedGet.mock.calls.map((call) => String(call[0]));
}

describe("useExpensePageData — the endpoint is part of the cache key", () => {
  it("issues a second request when selfService flips under identical params", async () => {
    const client = freshClient();
    const { result, rerender } = renderHook(
      ({ selfService }: { selfService: boolean }) =>
        useExpensePageData(STABLE_FILTERS, { selfService }),
      { wrapper: makeWrapper(client), initialProps: { selfService: true } },
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(requestedUrls()).toEqual([SELF_URL]);

    rerender({ selfService: false });

    await waitFor(() => {
      expect(requestedUrls()).toContain(ORG_URL);
    });

    await waitFor(() => {
      expect(result.current.data?.isAdmin).toBe(true);
    });
  });

  it("keeps the two scopes in separate cache entries", async () => {
    const client = freshClient();

    const self = renderHook(
      () => useExpensePageData(STABLE_FILTERS, { selfService: true }),
      { wrapper: makeWrapper(client) },
    );
    await waitFor(() => {
      expect(self.result.current.data).toBeDefined();
    });

    const org = renderHook(
      () => useExpensePageData(STABLE_FILTERS, { selfService: false }),
      { wrapper: makeWrapper(client) },
    );
    await waitFor(() => {
      expect(org.result.current.data).toBeDefined();
    });

    expect(self.result.current.data?.isAdmin).toBe(false);
    expect(org.result.current.data?.isAdmin).toBe(true);

    const keys = client
      .getQueryCache()
      .getAll()
      .map((query) => JSON.stringify(query.queryKey));
    expect(new Set(keys).size).toBe(2);
  });

  it("both scopes still answer to the hr.expenses invalidation prefix", async () => {
    const client = freshClient();

    const self = renderHook(
      () => useExpensePageData(STABLE_FILTERS, { selfService: true }),
      { wrapper: makeWrapper(client) },
    );
    const org = renderHook(
      () => useExpensePageData(STABLE_FILTERS, { selfService: false }),
      { wrapper: makeWrapper(client) },
    );
    await waitFor(() => {
      expect(self.result.current.data).toBeDefined();
      expect(org.result.current.data).toBeDefined();
    });

    const { queryKeys } = await import("@/lib/query-keys");
    const matched = client
      .getQueryCache()
      .findAll({ queryKey: queryKeys.hr.expenses() });

    expect(matched.length).toBe(2);
  });
});
