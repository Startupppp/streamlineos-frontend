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

const ORG_ID = "org-1";
const USER_ID = "user-1";

const GRANTED_SNAPSHOT: AccessResponse = {
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
    expect(apiClient.get).not.toHaveBeenCalledWith(
      expect.stringContaining("/me/access"),
    );
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
    );
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
