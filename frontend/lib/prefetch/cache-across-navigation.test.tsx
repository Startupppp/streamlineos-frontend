/**
 * Criterion c8-02 (last open item): client-side navigation between two
 * converted list routes must NOT refetch from the server — data comes from the
 * TanStack Query cache because each hook declares staleTime:60_000 and the
 * QueryClient persists across navigations.
 *
 * What the test proves:
 *  1. Mounting route A, navigating away, visiting route B, then back to A
 *     results in exactly ONE API call for route A's URL.
 *  2. The query was actually enabled and data DID arrive — a disabled query
 *     cannot masquerade as "no refetch".
 *  3. (Negative) With a fresh QueryClient per mount, the count rises to 2 —
 *     the test can detect refetches and is not a tautology.
 *  4. (Negative) After explicit invalidation the remount IS refetched —
 *     staleness alone drives the behaviour, not the initial-mount exemption.
 */

jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));
jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));

import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor, act } from "@testing-library/react";

import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { useWorkers } from "@/hooks/api/directory/workers";
import { usePaginatedRoles } from "@/hooks/api/roles";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import type { WorkersPage } from "@/types/directory/workers";
import type { PaginatedRolesResponse } from "@/hooks/api/roles";

// ---------- typed mock handles ----------

const mockedUseSession = useSession as jest.Mock;
const mockedGet = apiClient.get as jest.Mock;

// ---------- fixtures ----------

const ORG = "org-nav";
const USER = "user-nav";
const SCOPE = authenticatedScope(ORG, USER);

function makeAccess(): AccessResponse {
  return {
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: {},
    scopes: {
      "directory:workers:view": "all",
      "settings:rbac:manage": "all",
    },
  };
}

// Minimal valid shapes — only what the hooks type-check against.
const WORKERS_PAGE: WorkersPage = {
  data: [],
  pageInfo: { limit: 20, hasMore: false, nextCursor: null },
};

const ROLES_PAGE: PaginatedRolesResponse = {
  data: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
};

// ---------- helpers ----------

function stubSession(): void {
  mockedUseSession.mockReturnValue({
    data: { orgId: ORG, user: { id: USER } },
    status: "authenticated",
  });
}

/**
 * Create a client scoped to the test identity, with the access response
 * pre-seeded so useCan() resolves from cache without hitting the API.
 */
function makeClient() {
  const qc = createAppQueryClient(SCOPE);
  qc.setQueryData(queryKeys.access.me(ORG, USER), makeAccess());
  return qc;
}

/** Count how many times GET was called for the workers list endpoint. */
function workerGetCalls(): number {
  return mockedGet.mock.calls.filter(([url]: [string]) =>
    typeof url === "string" && url.includes("/directory/workers"),
  ).length;
}

/** Count how many times GET was called for the roles list endpoint. */
function rolesGetCalls(): number {
  return mockedGet.mock.calls.filter(([url]: [string]) =>
    url === "/roles",
  ).length;
}

// ---------- probe components ----------

/** Renders a testid-able element showing the workers query status. */
function WorkersProbe({ label }: { label: string }) {
  const { status } = useWorkers({});
  return <span data-testid={`workers-${label}`} data-status={status} />;
}

/** Renders a testid-able element showing the roles query status. */
function RolesProbe() {
  const { status } = usePaginatedRoles({ page: 1, limit: 20 });
  return <span data-testid="roles" data-status={status} />;
}

function wrap(
  client: ReturnType<typeof makeClient>,
  children: React.ReactNode,
) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// ---------- tests ----------

describe("client-side navigation cache contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stubSession();

    mockedGet.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/directory/workers"))
        return Promise.resolve(WORKERS_PAGE);
      if (url === "/roles") return Promise.resolve(ROLES_PAGE);
      // Access is seeded fresh in the client — this branch should not be
      // reached, but returning a never-resolving promise prevents any
      // accidental background call from polluting the count assertions.
      return new Promise<never>(() => {});
    });
  });

  it("1. remounting a converted list route serves data from cache — API called exactly once", async () => {
    const qc = makeClient();

    // ── Leg A: workers route ──────────────────────────────────────────────
    const mount1 = render(wrap(qc, <WorkersProbe label="first" />));
    await waitFor(() =>
      expect(
        mount1.getByTestId("workers-first").getAttribute("data-status"),
      ).toBe("success"),
    );
    // Data arrived → query was enabled (not silently disabled)
    expect(workerGetCalls()).toBe(1);
    mount1.unmount();

    // ── Leg B: roles route (different key, different URL) ─────────────────
    const mount2 = render(wrap(qc, <RolesProbe />));
    await waitFor(() =>
      expect(mount2.getByTestId("roles").getAttribute("data-status")).toBe(
        "success",
      ),
    );
    expect(rolesGetCalls()).toBe(1);
    mount2.unmount();

    // ── Return to workers ─────────────────────────────────────────────────
    const mount3 = render(wrap(qc, <WorkersProbe label="second" />));
    await waitFor(() =>
      expect(
        mount3.getByTestId("workers-second").getAttribute("data-status"),
      ).toBe("success"),
    );

    // The count must still be 1 — the second mount read the in-memory cache.
    expect(workerGetCalls()).toBe(1);
    mount3.unmount();
  });

  it("2. (negative) a fresh QueryClient per mount DOES refetch — the test can detect the difference", async () => {
    // Mount 1: own client, no prior cache
    const qc1 = makeClient();
    const mount1 = render(wrap(qc1, <WorkersProbe label="fresh-a" />));
    await waitFor(() =>
      expect(
        mount1.getByTestId("workers-fresh-a").getAttribute("data-status"),
      ).toBe("success"),
    );
    expect(workerGetCalls()).toBe(1);
    mount1.unmount();

    // Mount 2: different client, no shared cache → must fetch again
    const qc2 = makeClient();
    const mount2 = render(wrap(qc2, <WorkersProbe label="fresh-b" />));
    await waitFor(() =>
      expect(
        mount2.getByTestId("workers-fresh-b").getAttribute("data-status"),
      ).toBe("success"),
    );

    // Two fetches: the cache miss is visible, so the first test is not a tautology.
    expect(workerGetCalls()).toBe(2);
    mount2.unmount();
  });

  it("3. (negative) after invalidation a remount triggers a refetch — staleTime is the active guard", async () => {
    const qc = makeClient();

    // First mount and settle
    const mount1 = render(wrap(qc, <WorkersProbe label="pre-inv" />));
    await waitFor(() =>
      expect(
        mount1.getByTestId("workers-pre-inv").getAttribute("data-status"),
      ).toBe("success"),
    );
    expect(workerGetCalls()).toBe(1);
    mount1.unmount();

    // Mark the workers queries as stale — exactly as a mutation side-effect
    // would, or as time elapsing past staleTime would.
    await act(async () => {
      await qc.invalidateQueries({
        queryKey: queryKeys.directory.workersAll,
      });
    });

    // Remount — the query is now stale, so refetchOnMount fires.
    const mount2 = render(wrap(qc, <WorkersProbe label="post-inv" />));
    await waitFor(() =>
      expect(
        mount2.getByTestId("workers-post-inv").getAttribute("data-status"),
      ).toBe("success"),
    );

    // Called twice: once before invalidation, once after.
    expect(workerGetCalls()).toBe(2);
    mount2.unmount();
  });
});
