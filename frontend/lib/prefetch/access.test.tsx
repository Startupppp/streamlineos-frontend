import React from "react";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { render, waitFor, act } from "@testing-library/react";
import { useCan } from "@/hooks/api/access";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope, scopedQueryKeyHashFn } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

// ---------- mocks ----------

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";

const mockedUseSession = useSession as jest.Mock;
const mockedGet = apiClient.get as jest.Mock;

// ---------- fixtures ----------

const ORG_A = "org-a";
const ORG_B = "org-b";
const USER_1 = "user-1";
const TEST_PERMISSION: PermissionKey = "hr:employees:view";

function makeGranting(): AccessResponse {
  return {
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: {},
    scopes: { [TEST_PERMISSION]: "all" },
  };
}

function makeDenying(): AccessResponse {
  return {
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: {},
    scopes: {},
  };
}

function stubSession(orgId: string, userId: string) {
  mockedUseSession.mockReturnValue({
    data: { orgId, user: { id: userId } },
    status: "authenticated",
  });
}

function GatedControl() {
  const can = useCan(TEST_PERMISSION);
  return <span data-testid="result">{can ? "granted" : "denied"}</span>;
}

function makeClient(orgId: string, userId: string) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryKeyHashFn: scopedQueryKeyHashFn(authenticatedScope(orgId, userId)),
      },
      mutations: { retry: false },
    },
  });
}

function makeServerClient(orgId: string, userId: string) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: scopedQueryKeyHashFn(authenticatedScope(orgId, userId)),
      },
    },
  });
}

// ---------- tests ----------

describe("access prefetch — acceptance criteria", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: API never resolves — prevents a background refetch from
    // masking a first-paint failure or interfering with assertions.
    mockedGet.mockReturnValue(new Promise(() => {}));
  });

  // Scope: this asserts the first CLIENT render reads the hydrated cache, i.e. no
  // post-hydration flash. It says nothing about the server-rendered HTML — the
  // authenticated shell renders a loading screen there regardless (see c8-02).
  it("1. no post-hydration flash — hydrated snapshot renders the granted control on the first client render", () => {
    stubSession(ORG_A, USER_1);

    const serverQC = makeServerClient(ORG_A, USER_1);
    serverQC.setQueryData(queryKeys.access.me(), makeGranting());
    const snapshot = dehydrate(serverQC);

    const clientQC = makeClient(ORG_A, USER_1);

    const { getByTestId } = render(
      <QueryClientProvider client={clientQC}>
        <HydrationBoundary state={snapshot}>
          <GatedControl />
        </HydrationBoundary>
      </QueryClientProvider>,
    );

    // No waitFor, no act — the FIRST committed render must already show the
    // granted control. A loading flash would render "denied" here.
    expect(getByTestId("result")).toHaveTextContent("granted");
  });

  it("2. org switch — org B cannot read org A hydrated snapshot", () => {
    const serverQC = makeServerClient(ORG_A, USER_1);
    serverQC.setQueryData(queryKeys.access.me(), makeGranting());
    const snapshot = dehydrate(serverQC);

    stubSession(ORG_B, USER_1);

    const clientQC = makeClient(ORG_B, USER_1);

    const { getByTestId } = render(
      <QueryClientProvider client={clientQC}>
        <HydrationBoundary state={snapshot}>
          <GatedControl />
        </HydrationBoundary>
      </QueryClientProvider>,
    );

    expect(getByTestId("result")).toHaveTextContent("denied");
    expect(clientQC.getQueryData(queryKeys.access.me())).toBeUndefined();
  });

  it("3. post-invalidation — a newly granted permission appears without a hard reload", async () => {
    stubSession(ORG_A, USER_1);

    // First fetch: no permission granted
    mockedGet.mockResolvedValueOnce(makeDenying());

    const clientQC = makeClient(ORG_A, USER_1);

    const { getByTestId } = render(
      <QueryClientProvider client={clientQC}>
        <GatedControl />
      </QueryClientProvider>,
    );

    // Wait for the initial fetch to settle — permission is denied
    await waitFor(() =>
      expect(getByTestId("result")).toHaveTextContent("denied"),
    );

    // A server-side role change grants the permission; next fetch returns new snapshot
    mockedGet.mockResolvedValue(makeGranting());

    // Invalidate — exactly as a mutation side-effect would
    await act(async () => {
      await clientQC.invalidateQueries({
        queryKey: queryKeys.access.me(),
      });
    });

    // After the background refetch the control must appear — no hard reload needed
    await waitFor(() =>
      expect(getByTestId("result")).toHaveTextContent("granted"),
    );
  });
});
