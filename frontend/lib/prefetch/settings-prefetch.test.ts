/**
 * Every settings prefetch must land under the exact key its client hook asks with.
 */
jest.mock("server-only", () => ({}));

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(),
}));

jest.mock("@/lib/server-fetch", () => ({
  serverGet: jest.fn(),
}));

jest.mock("@/lib/rbac/get-server-access", () => ({
  getServerAccessResult: jest.fn(),
  getServerAccess: jest.fn(),
}));

import { hydrate } from "@tanstack/react-query";
import type { DehydratedState, QueryKey } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { authenticatedScope } from "@/lib/query-scope";
import { getServerAuth } from "@/lib/get-server-auth";
import { getServerAccessResult } from "@/lib/rbac/get-server-access";
import { serverGet } from "@/lib/server-fetch";
import type { AccessResponse } from "@/types/access";

import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";

import { readUsersListState } from "@/features/directory/users/users-list-state";
import { readAuditLogFilters } from "@/features/settings/audit-log/audit-log-constants";
import { readDelegationListState } from "@/features/settings/delegations/delegation-list-state";
import { RBAC_AUDIT_INITIAL_FILTERS } from "@/features/settings/roles/roles-audit-constants";
import { parsePageSize } from "@/lib/list-pagination";
import {
  ACCOUNT_LOGIN_HISTORY_PARAMS,
  AI_CREDITS_USAGE_DAYS,
  AI_CREDIT_TRANSACTION_PARAMS,
  SIMULATION_CANDIDATE_PARAMS,
} from "@/lib/settings-initial-reads";

import { prefetchAccountSettings } from "./settings-account";
import {
  prefetchOrgModules,
  prefetchRoleSimulation,
  prefetchRolesAudit,
  prefetchSettingsAuditLog,
  prefetchSettingsDelegations,
  prefetchSettingsUsers,
  prefetchSettingsWebhooks,
} from "./settings-admin";
import {
  prefetchAiCreditsSettings,
  prefetchBillingSettings,
} from "./settings-billing";

const BACKEND_JWT = "backend-jwt-must-never-cross-the-boundary";
const ORG = "org-settings";
const USER = "user-settings";
const SCOPE = authenticatedScope(ORG, USER);

const ALL_KEYS = [
  "settings:manage",
  "settings:view",
  "settings:webhooks:manage",
  "settings:rbac:manage",
  "audit-log:read",
  "billing:subscription:view",
  "billing:seats:view",
  "billing:profile:view",
  "billing:ai-credits:view",
] as const;

function accessWith(keys: readonly string[]): AccessResponse {
  return {
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: {},
    scopes: Object.fromEntries(keys.map((key) => [key, "all"])),
  };
}

function grantAll(): void {
  (getServerAccessResult as jest.Mock).mockResolvedValue({
    ok: true,
    access: accessWith(ALL_KEYS),
  });
}

function grantNothing(): void {
  (getServerAccessResult as jest.Mock).mockResolvedValue({
    ok: true,
    access: accessWith([]),
  });
}

const ORG_MODULES_BODY = [{ moduleKey: "HR", enabled: true }];

/** Every read answers with a body that names its own path, so a swap is visible. */
function respondByPath(): void {
  (serverGet as jest.Mock).mockImplementation((path: string) =>
    Promise.resolve(
      path === "/access/org-modules" ? ORG_MODULES_BODY : { readFrom: path },
    ),
  );
}

function hydratedValue(state: DehydratedState, key: QueryKey): unknown {
  const app = createAppQueryClient(SCOPE);
  hydrate(app, state);
  return app.getQueryData(key);
}

function requestedPaths(): string[] {
  return (serverGet as jest.Mock).mock.calls.map(([path]: [string]) => path);
}

const NO_PARAMS = new URLSearchParams();

interface ExpectedRead {
  readonly key: QueryKey;
  readonly path: string;
  readonly value?: unknown;
  /** Reads the client itself fires with no permission gate, so the prefetch must not add one. */
  readonly ungated?: true;
}

interface PrefetchCase {
  readonly route: string;
  readonly run: () => Promise<DehydratedState>;
  readonly expected: readonly ExpectedRead[];
}

const CASES: readonly PrefetchCase[] = [
  {
    route: "/settings",
    run: prefetchAccountSettings,
    expected: [
      { key: accessAndCrmQueryKeys.sessions.list(), path: "/sessions", ungated: true },
      {
        key: supportAndWorkflowsQueryKeys.auth.loginHistory(ACCOUNT_LOGIN_HISTORY_PARAMS),
        path: "/me/login-history?page=1&limit=5",
        ungated: true,
      },
      {
        key: supportAndWorkflowsQueryKeys.mfa.status(),
        path: "/auth/mfa/status",
        ungated: true,
      },
    ],
  },
  {
    route: "/settings/modules",
    run: prefetchOrgModules,
    expected: [
      {
        key: platformCoreQueryKeys.access.orgModules(),
        path: "/access/org-modules",
        value: ORG_MODULES_BODY,
      },
    ],
  },
  {
    route: "/settings/users",
    run: () => prefetchSettingsUsers(readUsersListState(NO_PARAMS)),
    expected: [
      {
        key: usersAndCommerceQueryKeys.users.list(readUsersListState(NO_PARAMS)),
        path: "/v2/users?limit=20&sortBy=joinedAt&sortOrder=desc",
      },
      { key: usersAndCommerceQueryKeys.users.stats(), path: "/users/stats" },
    ],
  },
  {
    route: "/settings/webhooks",
    run: () =>
      prefetchSettingsWebhooks({
        cursor: undefined,
        limit: parsePageSize(NO_PARAMS.get("size")),
      }),
    expected: [
      {
        key: supportAndWorkflowsQueryKeys.webhooks.list({
          cursor: undefined,
          limit: 20,
        }),
        path: "/webhooks?limit=20",
      },
    ],
  },
  {
    route: "/settings/audit-log",
    run: () => prefetchSettingsAuditLog(readAuditLogFilters(NO_PARAMS)),
    expected: [
      {
        key: accessAndCrmQueryKeys.auditLog.list(readAuditLogFilters(NO_PARAMS)),
        path: "/audit-log?limit=15",
      },
      { key: accessAndCrmQueryKeys.auditLog.actions(), path: "/audit-log/actions" },
      {
        key: accessAndCrmQueryKeys.auditLog.targetTypes(),
        path: "/audit-log/target-types",
      },
    ],
  },
  {
    route: "/settings/delegations",
    run: () =>
      prefetchSettingsDelegations(
        { ...readDelegationListState(NO_PARAMS, "received"), cursor: undefined },
        { ...readDelegationListState(NO_PARAMS, "granted"), cursor: undefined },
      ),
    expected: [
      {
        key: supportAndWorkflowsQueryKeys.delegations.received({
          ...readDelegationListState(NO_PARAMS, "received"),
          cursor: undefined,
        }),
        path: "/access/delegations?limit=20",
      },
      {
        key: supportAndWorkflowsQueryKeys.delegations.given({
          ...readDelegationListState(NO_PARAMS, "granted"),
          cursor: undefined,
        }),
        path: "/access/delegations/given?limit=20",
      },
      {
        key: accessAndCrmQueryKeys.roles.discoveryMembers(),
        path: "/rbac/discovery/members",
      },
    ],
  },
  {
    route: "/settings/billing",
    run: () => prefetchBillingSettings("plan"),
    expected: [
      { key: growthAndSignQueryKeys.billing.subscription(), path: "/billing" },
      { key: growthAndSignQueryKeys.billing.plans(), path: "/billing/plans", ungated: true },
      {
        key: growthAndSignQueryKeys.billing.entitlements(),
        path: "/billing/entitlements",
        ungated: true,
      },
      { key: growthAndSignQueryKeys.billing.seats(), path: "/billing/seats" },
    ],
  },
  {
    route: "/settings/billing/ai-credits",
    run: prefetchAiCreditsSettings,
    expected: [
      { key: growthAndSignQueryKeys.billing.aiCredits(), path: "/billing/ai-credits" },
      {
        key: growthAndSignQueryKeys.billing.aiCreditTransactions(
          AI_CREDIT_TRANSACTION_PARAMS,
        ),
        path: "/billing/ai-credits/transactions?limit=20",
      },
      {
        key: growthAndSignQueryKeys.billing.aiCreditsUsage(AI_CREDITS_USAGE_DAYS),
        path: "/billing/ai-credits/usage?days=30",
      },
    ],
  },
  {
    route: "/settings/roles/simulate",
    run: prefetchRoleSimulation,
    expected: [
      {
        key: platformCoreQueryKeys.access.simulationCandidates(
          SIMULATION_CANDIDATE_PARAMS,
        ),
        path: "/roles/simulate/candidates?limit=100",
      },
    ],
  },
  {
    route: "/settings/roles/audit",
    run: () => prefetchRolesAudit(RBAC_AUDIT_INITIAL_FILTERS),
    expected: [
      {
        key: accessAndCrmQueryKeys.auditLog.list(RBAC_AUDIT_INITIAL_FILTERS),
        path: "/audit-log?limit=25&actions=role.changed%2Crole.permissions.set%2Crole.member.added%2Crole.member.removed%2Crole.assigned%2Crole.unassigned%2Crole.created%2Crole.updated%2Crole.deleted%2Cpermission.granted%2Cpermission.revoked",
      },
    ],
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  (getServerAuth as jest.Mock).mockResolvedValue({
    orgId: ORG,
    user: { id: USER },
    backendJwt: BACKEND_JWT,
  });
  respondByPath();
  grantAll();
});

describe("settings prefetch → the client's own cache", () => {
  it.each(CASES.map((entry) => [entry.route, entry] as const))(
    "%s hydrates every initial read under the key its hook asks with",
    async (_route, entry) => {
      const state = await entry.run();

      expect(state.queries).toHaveLength(entry.expected.length);
      for (const read of entry.expected)
        expect(hydratedValue(state, read.key)).toEqual(
          read.value ?? { readFrom: read.path },
        );
    },
  );

  it.each(CASES.map((entry) => [entry.route, entry] as const))(
    "%s issues exactly the reads it hydrates and no others",
    async (_route, entry) => {
      await entry.run();

      expect(requestedPaths().sort()).toEqual(
        entry.expected.map((read) => read.path).sort(),
      );
    },
  );

  it.each(CASES.map((entry) => [entry.route, entry] as const))(
    "%s issues zero protected reads for a denied actor",
    async (_route, entry) => {
      grantNothing();

      const state = await entry.run();
      const ungated = entry.expected.filter((read) => read.ungated === true);

      expect(requestedPaths().sort()).toEqual(
        ungated.map((read) => read.path).sort(),
      );
      expect(state.queries).toHaveLength(ungated.length);
    },
  );

  it("hydrates nothing at all when the access read itself failed", async () => {
    (getServerAccessResult as jest.Mock).mockResolvedValue({ ok: false });

    const state = await prefetchSettingsUsers(readUsersListState(NO_PARAMS));

    expect(requestedPaths()).toEqual([]);
    expect(state.queries).toEqual([]);
  });
});

describe("every gated read is really gated", () => {
  it("names the reads that stay open, so a new one cannot slip in unnoticed", () => {
    const open = CASES.flatMap((entry) =>
      entry.expected.filter((read) => read.ungated === true).map((read) => read.path),
    ).sort();

    expect(open).toEqual([
      "/auth/mfa/status",
      "/billing/entitlements",
      "/billing/plans",
      "/me/login-history?page=1&limit=5",
      "/sessions",
    ]);
  });
});

describe("a plain QueryClient snapshot would be unreachable", () => {
  it("proves the scoped hash is what makes these assertions meaningful", async () => {
    const state = await prefetchOrgModules();
    const otherPerson = createAppQueryClient(authenticatedScope(ORG, "someone-else"));
    hydrate(otherPerson, state);

    expect(
      otherPerson.getQueryData(platformCoreQueryKeys.access.orgModules()),
    ).toBeUndefined();
  });
});

describe("nothing secret crosses the server/client boundary", () => {
  it.each(CASES.map((entry) => [entry.route, entry] as const))(
    "%s dehydrates no token, cookie or authorization header",
    async (_route, entry) => {
      const serialized = JSON.stringify(await entry.run());

      expect(serialized).not.toContain(BACKEND_JWT);
      expect(serialized.toLowerCase()).not.toContain("authorization");
      expect(serialized.toLowerCase()).not.toContain("backendjwt");
      expect(serialized.toLowerCase()).not.toContain("set-cookie");
    },
  );
});
