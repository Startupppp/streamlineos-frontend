import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryKeys } from "@/lib/query-keys";
import type { AccessResponse } from "@/types/access";

/**
 * The defect class: TWO observers on ONE query key, only one of them gated.
 *
 * TanStack enables a query when ANY observer enables it. So a component that
 * writes `enabled: <permission>` on a key another component already observes
 * without that condition has written a gate that never suppresses a request —
 * it reads as authorization in review and is inert at runtime.
 *
 * Neither existing gate can see this shape, and both say so about themselves in
 * different words:
 *   - `check:gated-reads` has `SCAN_DIRS = ["hooks/api"]`, so it never reads the
 *     `features/**` and `components/**` files where the two observers live.
 *   - `check:permission-binding` does read those trees, but it classifies each
 *     call site in isolation (one row per WRAPPER or ENABLED site) and holds no
 *     notion of a key observed twice.
 * A repo-wide walk over consumer call sites (3,487 of them, 2,840 distinct
 * hook+argument identities) found 20 identities observed from two or more sites
 * with differing `enabled`. Only the co-mounted ones are defects; this file
 * pins the mechanism and the two that were.
 */

jest.mock("next-auth/react", () => ({
  useSession: jest
    .fn()
    .mockReturnValue({ data: { orgId: "org-1", user: { id: "user-1" } } }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

function makeClient(scopes: string[]): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const access: AccessResponse = {
    scopes: Object.fromEntries(
      scopes.map((k) => [k, "all"]),
    ) as AccessResponse["scopes"],
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: { HR: true, CRM: true },
  };
  client.setQueryData(queryKeys.access.me(), access);
  return client;
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function urlsFor(fragment: string): string[] {
  return apiClient.get.mock.calls
    .map((call) => String(call[0]))
    .filter((url) => url.includes(fragment));
}

beforeEach(() => {
  jest.clearAllMocks();
  apiClient.get.mockResolvedValue({});
});

describe("the least restrictive observer decides, which is why a sibling gate is inert", () => {
  const KEY = ["streamlineos", "shared-key-union-fixture"] as const;

  function Reader({ enabled }: { enabled: boolean }) {
    useQuery({
      queryKey: KEY,
      queryFn: ({ signal }) =>
        apiClient.get("/fixture/shared-key", undefined, signal),
      enabled,
      staleTime: 0,
    });
    return null;
  }

  it("fires the request even though one observer is gated shut", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = wrap(client);
    render(
      <Wrapper>
        <Reader enabled={false} />
        <Reader enabled />
      </Wrapper>,
    );
    await waitFor(() => expect(urlsFor("/fixture/shared-key")).toHaveLength(1));
  });

  it("sends nothing when EVERY observer is gated shut", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = wrap(client);
    render(
      <Wrapper>
        <Reader enabled={false} />
        <Reader enabled={false} />
      </Wrapper>,
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(urlsFor("/fixture/shared-key")).toHaveLength(0);
  });
});

describe("BusinessPulseWidget gates its mount, not an enabled flag it cannot own", () => {
  it("mounts no executive-dashboard read for a viewer without crm:leads:view", async () => {
    const client = makeClient(["hr:analytics:read"]);
    const Wrapper = wrap(client);
    const { BusinessPulseWidget } = await import(
      "@/components/dashboard/project-health-widget"
    );
    render(
      <Wrapper>
        <BusinessPulseWidget />
      </Wrapper>,
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(urlsFor("/dashboard/executive")).toHaveLength(0);
  });

  /**
   * The regression that matters. `/dashboard` mounts BOTH widgets, so the
   * question is not whether this widget's own gate holds alone — an `enabled`
   * flag holds alone too — but whether it still holds beside the sibling that
   * observes the same key without a CRM condition. This is the assertion the
   * inert `enabled: hasCrmAccess` could not satisfy.
   */
  it("still mounts nothing of its own beside the sibling that observes the same key", async () => {
    const client = makeClient(["hr:analytics:read"]);
    const Wrapper = wrap(client);
    const { BusinessPulseWidget } = await import(
      "@/components/dashboard/project-health-widget"
    );
    const { ExecutiveKpiWidget } = await import(
      "@/components/dashboard/executive-kpi-widget"
    );
    render(
      <Wrapper>
        <ExecutiveKpiWidget />
        <BusinessPulseWidget />
      </Wrapper>,
    );
    // The sibling is entitled to the read: `/dashboard/executive` declares
    // `hr:analytics:read`, which this viewer holds. Exactly one request, and it
    // is the sibling's — never a second observer this widget should not have.
    await waitFor(() => expect(urlsFor("/dashboard/executive")).toHaveLength(1));
    expect(
      client.getQueryCache().find({ queryKey: queryKeys.dashboard.executive() })
        ?.observers.length,
    ).toBe(1);
  });

  it("reads the executive dashboard once the viewer holds crm:leads:view", async () => {
    const client = makeClient(["hr:analytics:read", "crm:leads:view"]);
    const Wrapper = wrap(client);
    const { BusinessPulseWidget } = await import(
      "@/components/dashboard/project-health-widget"
    );
    render(
      <Wrapper>
        <BusinessPulseWidget />
      </Wrapper>,
    );
    await waitFor(() => expect(urlsFor("/dashboard/executive")).toHaveLength(1));
  });

  it("stays silent for a viewer holding neither key, so the hook's own gate still bites", async () => {
    const client = makeClient([]);
    const Wrapper = wrap(client);
    const { BusinessPulseWidget } = await import(
      "@/components/dashboard/project-health-widget"
    );
    render(
      <Wrapper>
        <BusinessPulseWidget />
      </Wrapper>,
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(urlsFor("/dashboard/executive")).toHaveLength(0);
  });
});
