/**
 * The URL decides the key. A snapshot under the wrong key is not a prefetch.
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
import { grantsPermission } from "@/lib/rbac/permission-gate";
import { getServerAuth } from "@/lib/get-server-auth";
import { getServerAccessResult } from "@/lib/rbac/get-server-access";
import { serverGet } from "@/lib/server-fetch";
import type { AccessResponse } from "@/types/access";

import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";

import { readUsersListState } from "@/features/directory/users/users-list-state";
import { readAuditLogFilters } from "@/features/settings/audit-log/audit-log-constants";
import { readDelegationListState } from "@/features/settings/delegations/delegation-list-state";

import {
  prefetchSettingsAuditLog,
  prefetchSettingsDelegations,
  prefetchSettingsUsers,
} from "./settings-admin";
import { prefetchBillingSettings } from "./settings-billing";

const ORG = "org-params";
const USER = "user-params";
const SCOPE = authenticatedScope(ORG, USER);
const NO_PARAMS = new URLSearchParams();

const ALL_KEYS = [
  "settings:view",
  "settings:rbac:manage",
  "audit-log:read",
  "billing:subscription:view",
  "billing:seats:view",
  "billing:profile:view",
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

function respondByPath(): void {
  (serverGet as jest.Mock).mockImplementation((path: string) =>
    Promise.resolve({ readFrom: path }),
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

beforeEach(() => {
  jest.clearAllMocks();
  (getServerAuth as jest.Mock).mockResolvedValue({
    orgId: ORG,
    user: { id: USER },
    backendJwt: "token",
  });
  respondByPath();
  grantAll();
});

describe("search parameters select a different cache entry", () => {
  it("a filtered members URL hydrates a key the unfiltered page never reads", async () => {
    const filtered = new URLSearchParams({
      search: "asha",
      status: "suspended",
      size: "50",
      sortBy: "name",
      sortOrder: "asc",
    });

    const state = await prefetchSettingsUsers(readUsersListState(filtered));

    expect(
      hydratedValue(
        state,
        usersAndCommerceQueryKeys.users.list(readUsersListState(filtered)),
      ),
    ).toEqual({
      readFrom: "/v2/users?limit=50&search=asha&status=suspended&sortBy=name&sortOrder=asc",
    });
    expect(
      hydratedValue(
        state,
        usersAndCommerceQueryKeys.users.list(readUsersListState(NO_PARAMS)),
      ),
    ).toBeUndefined();
  });

  it("a filtered audit-log URL hydrates a key the unfiltered page never reads", async () => {
    const filtered = new URLSearchParams({
      size: "50",
      action: "user.login",
      target: "user",
      from: "2026-01-01",
      to: "2026-02-01",
      user: "asha",
    });

    const state = await prefetchSettingsAuditLog(readAuditLogFilters(filtered));

    expect(
      hydratedValue(
        state,
        accessAndCrmQueryKeys.auditLog.list(readAuditLogFilters(filtered)),
      ),
    ).toEqual({
      readFrom:
        "/audit-log?limit=50&action=user.login&targetType=user&dateFrom=2026-01-01&dateTo=2026-02-01&userSearch=asha",
    });
    expect(
      hydratedValue(
        state,
        accessAndCrmQueryKeys.auditLog.list(readAuditLogFilters(NO_PARAMS)),
      ),
    ).toBeUndefined();
  });

  it("a delegations URL moves each list independently", async () => {
    const filtered = new URLSearchParams({
      receivedSize: "50",
      grantedSearch: "alex",
    });
    const received = {
      ...readDelegationListState(filtered, "received"),
      cursor: undefined,
    };
    const given = {
      ...readDelegationListState(filtered, "granted"),
      cursor: undefined,
    };

    const state = await prefetchSettingsDelegations(received, given);

    expect(
      hydratedValue(state, supportAndWorkflowsQueryKeys.delegations.received(received)),
    ).toEqual({ readFrom: "/access/delegations?limit=50" });
    expect(
      hydratedValue(state, supportAndWorkflowsQueryKeys.delegations.given(given)),
    ).toEqual({ readFrom: "/access/delegations/given?limit=20&search=alex" });
  });

  it("each billing tab prefetches only what that tab mounts", async () => {
    const payments = await prefetchBillingSettings("payments");
    expect(requestedPaths()).toEqual(["/billing"]);
    expect(hydratedValue(payments, growthAndSignQueryKeys.billing.plans())).toBeUndefined();

    jest.clearAllMocks();
    respondByPath();
    grantAll();

    const profile = await prefetchBillingSettings("profile");
    expect(requestedPaths()).toEqual(["/billing/profile"]);
    expect(
      hydratedValue(profile, growthAndSignQueryKeys.billing.profile()),
    ).toEqual({ readFrom: "/billing/profile" });
  });
});

describe("a sub-read gated on a key the route does not require", () => {
  it("skips /billing/seats for a viewer who lacks billing:seats:view", async () => {
    (getServerAccessResult as jest.Mock).mockResolvedValue({
      ok: true,
      access: accessWith(["billing:subscription:view"]),
    });

    const state = await prefetchBillingSettings("plan");

    expect(requestedPaths()).not.toContain("/billing/seats");
    expect(hydratedValue(state, growthAndSignQueryKeys.billing.seats())).toBeUndefined();
    expect(hydratedValue(state, growthAndSignQueryKeys.billing.subscription())).toEqual({
      readFrom: "/billing",
    });
  });
});

describe("the gate the prefetch uses is the gate the client uses", () => {
  it("answers identically for an owner, a holder and everyone else", () => {
    const owner = { isOrgOwner: true, scopes: {} };
    const holder = { isOrgOwner: false, scopes: { "settings:view": "all" as const } };
    const other = { isOrgOwner: false, scopes: {} };

    expect(grantsPermission(owner, "settings:view")).toBe(true);
    expect(grantsPermission(holder, "settings:view")).toBe(true);
    expect(grantsPermission(other, "settings:view")).toBe(false);
    expect(grantsPermission(undefined, "settings:view")).toBe(false);
  });
});
