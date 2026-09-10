/**
 * A hydrated snapshot must remove the client read, not merely sit beside it.
 */
jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));
jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));

import React from "react";
import { QueryClientProvider, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { DehydratedState, QueryKey } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";

import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { authenticatedScope, scopedQueryKeyHashFn } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import { QueryClient } from "@tanstack/react-query";

import { useSessions } from "@/hooks/api/hr/sessions";
import { useLoginHistory } from "@/hooks/api/auth";
import { useMfaStatus } from "@/hooks/api/mfa";
import { useOrgModules } from "@/hooks/api/access/org-modules";
import { useUsers, useUserStats } from "@/hooks/api/users";
import { useWebhooks } from "@/hooks/api/webhooks";
import { useAuditLogs, useAuditLogActions } from "@/hooks/api/audit-log";
import { useReceivedDelegations, useGrantedDelegations } from "@/hooks/api/delegations";
import { useSubscription, useBillingPlans, useSeatInfo } from "@/hooks/api/subscription";
import {
  useAiCreditsWallet,
  useAiCreditTransactions,
  useAiCreditsUsage,
} from "@/hooks/api/ai-credits";
import { useSimulationCandidates } from "@/hooks/api/access/simulate";
import { useIncomingOrgTransfers } from "@/hooks/api/ownership";

import { readUsersListState } from "@/features/directory/users/users-list-state";
import { readAuditLogFilters } from "@/features/settings/audit-log/audit-log-constants";
import { readDelegationListState } from "@/features/settings/delegations/delegation-list-state";
import { RBAC_AUDIT_INITIAL_FILTERS } from "@/features/settings/roles/roles-audit-constants";
import {
  ACCOUNT_LOGIN_HISTORY_PARAMS,
  AI_CREDITS_USAGE_DAYS,
  AI_CREDIT_TRANSACTION_PARAMS,
  SIMULATION_CANDIDATE_PARAMS,
} from "@/lib/settings-initial-reads";

const ORG = "org-hydration";
const USER = "user-hydration";
const SCOPE = authenticatedScope(ORG, USER);
const NO_PARAMS = new URLSearchParams();

const GRANTED_KEYS = [
  "settings:manage",
  "settings:view",
  "settings:webhooks:manage",
  "settings:rbac:manage",
  "audit-log:read",
  "billing:subscription:view",
  "billing:seats:view",
  "billing:ai-credits:view",
  "ownership:transfer:respond",
];

const ACCESS: AccessResponse = {
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: {},
  scopes: Object.fromEntries(GRANTED_KEYS.map((key) => [key, "all"])),
};

const mockedGet = apiClient.get as jest.Mock;

interface HydrationCase {
  readonly route: string;
  readonly read: string;
  readonly key: QueryKey;
  readonly snapshot: unknown;
  readonly useRead: () => { status: string };
  /** Set where the hook deliberately refetches a fresh snapshot on every mount. */
  readonly refetchesOnMount?: true;
}

const CASES: readonly HydrationCase[] = [
  {
    route: "/settings",
    read: "/sessions",
    key: ["streamlineos", "sessions", "list"],
    snapshot: [],
    useRead: () => useSessions(),
  },
  {
    route: "/settings",
    read: "/me/login-history",
    key: ["streamlineos", "auth", "loginHistory", ACCOUNT_LOGIN_HISTORY_PARAMS],
    snapshot: { data: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 0 } },
    useRead: () => useLoginHistory(ACCOUNT_LOGIN_HISTORY_PARAMS),
  },
  {
    route: "/settings",
    read: "/auth/mfa/status",
    key: ["streamlineos", "mfa", "status"],
    snapshot: { enabled: false },
    useRead: () => useMfaStatus(),
  },
  {
    route: "/settings/modules",
    read: "/access/org-modules",
    key: ["streamlineos", "access", "org-modules"],
    snapshot: [{ moduleKey: "HR", enabled: true }],
    useRead: () => useOrgModules(),
  },
  {
    route: "/settings/users",
    read: "/v2/users",
    key: ["streamlineos", "users", "list", readUsersListState(NO_PARAMS)],
    snapshot: { data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } },
    useRead: () => useUsers(readUsersListState(NO_PARAMS)),
  },
  {
    route: "/settings/users",
    read: "/users/stats",
    key: ["streamlineos", "users", "stats"],
    snapshot: { total: 0, active: 0, suspended: 0, archived: 0 },
    useRead: () => useUserStats(),
  },
  {
    route: "/settings/webhooks",
    read: "/webhooks",
    key: ["streamlineos", "webhooks", "list", { cursor: undefined, limit: 20 }],
    snapshot: { data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } },
    useRead: () => useWebhooks({ cursor: undefined, limit: 20 }),
  },
  {
    route: "/settings/audit-log",
    read: "/audit-log",
    key: ["streamlineos", "auditLog", "list", readAuditLogFilters(NO_PARAMS)],
    snapshot: { logs: [], pagination: { limit: 15, hasMore: false, nextCursor: null } },
    useRead: () => useAuditLogs(readAuditLogFilters(NO_PARAMS)),
  },
  {
    route: "/settings/audit-log",
    read: "/audit-log/actions",
    key: ["streamlineos", "auditLog", "actions"],
    snapshot: [],
    useRead: () => useAuditLogActions(),
  },
  {
    route: "/settings/delegations",
    read: "/access/delegations",
    key: [
      "streamlineos",
      "delegations",
      "received",
      { ...readDelegationListState(NO_PARAMS, "received"), cursor: undefined },
    ],
    snapshot: { data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } },
    useRead: () =>
      useReceivedDelegations({
        ...readDelegationListState(NO_PARAMS, "received"),
        cursor: undefined,
      }),
  },
  {
    route: "/settings/delegations",
    read: "/access/delegations/given",
    key: [
      "streamlineos",
      "delegations",
      "given",
      { ...readDelegationListState(NO_PARAMS, "granted"), cursor: undefined },
    ],
    snapshot: { data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } },
    useRead: () =>
      useGrantedDelegations({
        ...readDelegationListState(NO_PARAMS, "granted"),
        cursor: undefined,
      }),
  },
  {
    route: "/settings/billing",
    read: "/billing",
    key: ["streamlineos", "billing", "subscription"],
    snapshot: { plan: "FREE" },
    useRead: () => useSubscription(),
  },
  {
    route: "/settings/billing",
    read: "/billing/plans",
    key: ["streamlineos", "billing", "plans"],
    snapshot: { plans: [] },
    useRead: () => useBillingPlans(),
  },
  {
    route: "/settings/billing",
    read: "/billing/seats",
    key: ["streamlineos", "billing", "seats"],
    snapshot: { used: 0, included: 0 },
    useRead: () => useSeatInfo(),
  },
  {
    route: "/settings/billing/ai-credits",
    read: "/billing/ai-credits",
    key: ["streamlineos", "billing", "ai-credits"],
    snapshot: { wallet: { balance: 0, autoTopUpEnabled: false }, packs: [] },
    useRead: () => useAiCreditsWallet(),
  },
  {
    route: "/settings/billing/ai-credits",
    read: "/billing/ai-credits/transactions",
    key: [
      "streamlineos",
      "billing",
      "ai-credits",
      "transactions",
      AI_CREDIT_TRANSACTION_PARAMS,
    ],
    snapshot: { data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } },
    useRead: () => useAiCreditTransactions(AI_CREDIT_TRANSACTION_PARAMS),
  },
  {
    route: "/settings/billing/ai-credits",
    read: "/billing/ai-credits/usage",
    key: [
      "streamlineos",
      "billing",
      "ai-credits",
      "usage",
      { days: AI_CREDITS_USAGE_DAYS },
    ],
    snapshot: { totals: {}, daily: [], byModel: [], byFeature: [] },
    useRead: () => useAiCreditsUsage(AI_CREDITS_USAGE_DAYS),
  },
  {
    route: "/settings/roles/simulate",
    read: "/roles/simulate/candidates",
    key: [
      "streamlineos",
      "access",
      "simulate",
      "candidates",
      SIMULATION_CANDIDATE_PARAMS,
    ],
    snapshot: { data: [], pagination: { limit: 100, hasMore: false, nextCursor: null } },
    useRead: () => useSimulationCandidates(""),
  },
  {
    route: "/settings/roles/audit",
    read: "/audit-log",
    key: ["streamlineos", "auditLog", "list", RBAC_AUDIT_INITIAL_FILTERS],
    snapshot: { logs: [], pagination: { limit: 25, hasMore: false, nextCursor: null } },
    useRead: () => useAuditLogs(RBAC_AUDIT_INITIAL_FILTERS),
  },
  {
    route: "/settings/incoming-transfer",
    read: "/ownership/transfers/incoming",
    key: ["streamlineos", "ownership", "transfers", "incoming"],
    snapshot: { data: [] },
    useRead: () => useIncomingOrgTransfers(),
    refetchesOnMount: true,
  },
];

function seed(key: QueryKey, value: unknown): DehydratedState {
  const server = new QueryClient({
    defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(SCOPE) } },
  });
  server.setQueryData(key, value);
  return dehydrate(server);
}

function makeClient() {
  const client = createAppQueryClient(SCOPE);
  client.setQueryData(platformCoreQueryKeys.access.me(), ACCESS);
  return client;
}

function callsTo(read: string): number {
  return mockedGet.mock.calls.filter(([url]: [string]) => url === read).length;
}

function Probe({ useRead }: { useRead: () => { status: string } }) {
  const { status } = useRead();
  return <span data-testid="probe" data-status={status} />;
}

function mount(entry: HydrationCase, state?: DehydratedState) {
  const client = makeClient();
  return render(
    <QueryClientProvider client={client}>
      <HydrationBoundary state={state}>
        <Probe useRead={entry.useRead} />
      </HydrationBoundary>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (useSession as jest.Mock).mockReturnValue({
    data: { orgId: ORG, user: { id: USER } },
    status: "authenticated",
  });
  mockedGet.mockImplementation(() => new Promise(() => {}));
});

describe("hydration removes the first-mount read", () => {
  it.each(CASES.map((entry) => [`${entry.route} ${entry.read}`, entry] as const))(
    "%s renders from the snapshot with no client call",
    async (_label, entry) => {
      const view = mount(entry, seed(entry.key, entry.snapshot));

      await waitFor(() =>
        expect(view.getByTestId("probe").getAttribute("data-status")).toBe("success"),
      );
      expect(callsTo(entry.read)).toBe(entry.refetchesOnMount === true ? 1 : 0);
      view.unmount();
    },
  );

  it.each(CASES.map((entry) => [`${entry.route} ${entry.read}`, entry] as const))(
    "%s does issue the read when nothing was hydrated — the count is real",
    async (_label, entry) => {
      const view = mount(entry);

      await waitFor(() => expect(callsTo(entry.read)).toBe(1));
      view.unmount();
    },
  );
});

describe("the one route whose policy discards a snapshot", () => {
  it("refetches the incoming ownership transfer on mount even when hydrated", async () => {
    const entry = CASES.find(
      (candidate) => candidate.route === "/settings/incoming-transfer",
    );
    if (!entry) throw new Error("incoming-transfer case missing");

    expect(entry.refetchesOnMount).toBe(true);

    const view = mount(entry, seed(entry.key, entry.snapshot));

    await waitFor(() => expect(callsTo(entry.read)).toBe(1));
    view.unmount();
  });
});
