import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useExpensePageData } from "@/hooks/api/hr/expenses";

/**
 * The expense list's cache key names the endpoint it read.
 *
 * `useExpensePageData` switches its URL on `options.selfService` — `/me/expenses`
 * (one person) versus `/hr/expenses/page-data` (the whole org) — while keying
 * both on `[...hr.expenses(), "pageData", params]`. One key, two scopes.
 *
 * That is reachable on every cold load of `/hr/expenses` by an approver:
 *
 *   1. `usePermissionGate` reads `data ? … : false` (hooks/api/access.ts), so
 *      `useCan("hr:expenses:approve")` is FALSE while `/me/access` is in flight
 *      and `isAdmin` starts false (expenses-page.tsx).
 *   2. `useExpenseFilters({ defaultPageSize: isAdmin ? 4 : 5 })` feeds that into
 *      a plain `useState(initialFilters)` (use-expense-filters.ts), so pageSize
 *      is seeded once at 5 and never changes when `defaultPageSize` does.
 *   3. The hook fetches `/me/expenses` under key K.
 *   4. `/me/access` resolves, `isAdmin` flips true, `selfService` flips false —
 *      but `params`, and therefore K, are byte-identical, and TanStack does not
 *      refetch because the query function changed identity.
 *   5. `expenses-page.tsx` takes its `if (isAdmin)` branch and renders
 *      AdminExpenseList over a member-scoped payload: no admin stats, and every
 *      other employee's pending claim missing, until the next window focus.
 *
 * An approver reviewing reimbursements concludes the queue is empty. It is not a
 * cross-user leak — the `authenticated:<org>:<user>` hash scope confines the
 * entry to one viewer and the direction narrows — but it is silently wrong data
 * on a money surface.
 *
 * This test is the step-4 assertion: flip `selfService` with the params held
 * byte-identical and require a second request.
 */

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

/** Exactly the shape step 2 produces: seeded once, unchanged across the flip. */
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

    // /me/access resolves: isAdmin flips true, so selfService flips false. The
    // filters are untouched — step 2 froze them.
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

    // A mutation invalidating the prefix must still reach BOTH entries, or
    // approving a claim would leave the other scope stale.
    expect(matched.length).toBe(2);
  });
});
