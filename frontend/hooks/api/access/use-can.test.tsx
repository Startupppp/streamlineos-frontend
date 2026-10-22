import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { useCan, useModuleEnabled } from "../access";
import { queryKeys } from "@/lib/query-keys";
import { resolveContract, type ContractSource } from "@/lib/api-envelope";
import type { AccessResponse } from "@/types/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

const GRANTED_SNAPSHOT: AccessResponse = {
  membershipId: 4711,
  scopes: { "hr:employees:view": "all" },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { hr: true },
};

function makeHydratedState() {
  const seed = new QueryClient();
  seed.setQueryData(queryKeys.access.me(), GRANTED_SNAPSHOT);
  return dehydrate(seed);
}

function Wrapper({
  client,
  hydratedState,
  children,
}: {
  client: QueryClient;
  hydratedState?: ReturnType<typeof dehydrate>;
  children: ReactNode;
}) {
  if (hydratedState !== undefined) {
    return (
      <QueryClientProvider client={client}>
        <HydrationBoundary state={hydratedState}>{children}</HydrationBoundary>
      </QueryClientProvider>
    );
  }
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function CanBadge({ permKey }: { permKey: PermissionKey }) {
  const result = useCan(permKey);
  return <span data-testid="can-result">{String(result)}</span>;
}

function ModuleBadge({ moduleKey }: { moduleKey: string }) {
  const result = useModuleEnabled(moduleKey);
  return <span data-testid="module-result">{String(result)}</span>;
}

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

beforeEach(() => jest.clearAllMocks());

describe("useCan — server prefetch seam", () => {
  it("answers true on first render from hydrated cache and makes no API call", () => {
    const state = makeHydratedState();
    const client = new QueryClient();

    render(
      <Wrapper client={client} hydratedState={state}>
        <CanBadge permKey="hr:employees:view" />
      </Wrapper>,
    );

    expect(screen.getByTestId("can-result").textContent).toBe("true");
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("falls back to fetching when HydrationBoundary carries no access cache", () => {
    apiClient.get.mockReturnValue(new Promise(() => {}));
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <CanBadge permKey="hr:employees:view" />
      </Wrapper>,
    );

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("/me/access"),
      undefined,
      expect.anything(),
      expect.any(Function),
    );
  });

  it("hands over a loader that resolves to a contract which really parses", async () => {
    apiClient.get.mockReturnValue(new Promise(() => {}));
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <CanBadge permKey="hr:employees:view" />
      </Wrapper>,
    );

    const [url, , , source] = apiClient.get.mock.calls[0] as [
      string,
      undefined,
      AbortSignal | undefined,
      ContractSource<AccessResponse>,
    ];
    expect(url).toContain("/me/access");
    const contract = await resolveContract(source);

    expect(contract).toBeDefined();
    expect(contract?.safeParse(GRANTED_SNAPSHOT).success).toBe(true);

    const drifted: Record<string, unknown> = { ...GRANTED_SNAPSHOT };
    delete drifted.isOrgOwner;
    expect(contract?.safeParse(drifted).success).toBe(false);
  });
});

describe("useModuleEnabled — loading default", () => {
  it("answers true while the access snapshot is unresolved", () => {
    apiClient.get.mockReturnValue(new Promise(() => {}));
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <ModuleBadge moduleKey="hr" />
      </Wrapper>,
    );

    expect(screen.getByTestId("module-result").textContent).toBe("true");
  });
});
