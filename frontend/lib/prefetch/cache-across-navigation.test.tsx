
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


const mockedUseSession = useSession as jest.Mock;
const mockedGet = apiClient.get as jest.Mock;


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

const WORKERS_PAGE: WorkersPage = {
  data: [],
  pageInfo: { limit: 20, hasMore: false, nextCursor: null },
};

const ROLES_PAGE: PaginatedRolesResponse = {
  data: [],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};


function stubSession(): void {
  mockedUseSession.mockReturnValue({
    data: { orgId: ORG, user: { id: USER } },
    status: "authenticated",
  });
}

function makeClient() {
  const qc = createAppQueryClient(SCOPE);
  qc.setQueryData(queryKeys.access.me(), makeAccess());
  return qc;
}

function workerGetCalls(): number {
  return mockedGet.mock.calls.filter(([url]: [string]) =>
    typeof url === "string" && url.includes("/directory/workers"),
  ).length;
}

function rolesGetCalls(): number {
  return mockedGet.mock.calls.filter(([url]: [string]) =>
    url === "/roles",
  ).length;
}


function WorkersProbe({ label }: { label: string }) {
  const { status } = useWorkers({});
  return <span data-testid={`workers-${label}`} data-status={status} />;
}

function RolesProbe() {
  const { status } = usePaginatedRoles({ limit: 20 });
  return <span data-testid="roles" data-status={status} />;
}

function wrap(
  client: ReturnType<typeof makeClient>,
  children: React.ReactNode,
) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}


describe("client-side navigation cache contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stubSession();

    mockedGet.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/directory/workers"))
        return Promise.resolve(WORKERS_PAGE);
      if (url === "/roles") return Promise.resolve(ROLES_PAGE);
      return new Promise<never>(() => {});
    });
  });

  it("1. remounting a converted list route serves data from cache — API called exactly once", async () => {
    const qc = makeClient();

    const mount1 = render(wrap(qc, <WorkersProbe label="first" />));
    await waitFor(() =>
      expect(
        mount1.getByTestId("workers-first").getAttribute("data-status"),
      ).toBe("success"),
    );
    expect(workerGetCalls()).toBe(1);
    mount1.unmount();

    const mount2 = render(wrap(qc, <RolesProbe />));
    await waitFor(() =>
      expect(mount2.getByTestId("roles").getAttribute("data-status")).toBe(
        "success",
      ),
    );
    expect(rolesGetCalls()).toBe(1);
    mount2.unmount();

    const mount3 = render(wrap(qc, <WorkersProbe label="second" />));
    await waitFor(() =>
      expect(
        mount3.getByTestId("workers-second").getAttribute("data-status"),
      ).toBe("success"),
    );

    expect(workerGetCalls()).toBe(1);
    mount3.unmount();
  });

  it("2. (negative) a fresh QueryClient per mount DOES refetch — the test can detect the difference", async () => {
    const qc1 = makeClient();
    const mount1 = render(wrap(qc1, <WorkersProbe label="fresh-a" />));
    await waitFor(() =>
      expect(
        mount1.getByTestId("workers-fresh-a").getAttribute("data-status"),
      ).toBe("success"),
    );
    expect(workerGetCalls()).toBe(1);
    mount1.unmount();

    const qc2 = makeClient();
    const mount2 = render(wrap(qc2, <WorkersProbe label="fresh-b" />));
    await waitFor(() =>
      expect(
        mount2.getByTestId("workers-fresh-b").getAttribute("data-status"),
      ).toBe("success"),
    );

    expect(workerGetCalls()).toBe(2);
    mount2.unmount();
  });

  it("3. (negative) after invalidation a remount triggers a refetch — staleTime is the active guard", async () => {
    const qc = makeClient();

    const mount1 = render(wrap(qc, <WorkersProbe label="pre-inv" />));
    await waitFor(() =>
      expect(
        mount1.getByTestId("workers-pre-inv").getAttribute("data-status"),
      ).toBe("success"),
    );
    expect(workerGetCalls()).toBe(1);
    mount1.unmount();

    await act(async () => {
      await qc.invalidateQueries({
        queryKey: queryKeys.directory.workersAll,
      });
    });

    const mount2 = render(wrap(qc, <WorkersProbe label="post-inv" />));
    await waitFor(() =>
      expect(
        mount2.getByTestId("workers-post-inv").getAttribute("data-status"),
      ).toBe("success"),
    );

    expect(workerGetCalls()).toBe(2);
    mount2.unmount();
  });
});
