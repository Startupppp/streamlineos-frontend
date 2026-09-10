/**
 * Every settings route either removes its post-paint initial read or says, in a
 * tested classification, why there is nothing to remove.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { collectAppRoutes } from "@/lib/rbac/route-access/app-routes";
import { backendPermissionNames } from "@/test-utils/permission-catalog";

const APP_DIR = resolve(process.cwd(), "app");
const FRONTEND_ROOT = resolve(process.cwd());

type Classification =
  | {
      readonly kind: "prefetch";
      readonly helper: string;
      readonly module: string;
      readonly gate: string;
    }
  | { readonly kind: "no-prefetch"; readonly reason: string; readonly evidence: string };

interface CensusEntry {
  readonly route: string;
  readonly classification: Classification;
}

const SETTINGS_PREFETCH = "lib/prefetch/settings.ts";
const SETTINGS_ADMIN = "lib/prefetch/settings-admin.ts";
const SETTINGS_ACCOUNT = "lib/prefetch/settings-account.ts";
const SETTINGS_BILLING = "lib/prefetch/settings-billing.ts";
const ROLES_PREFETCH = "lib/prefetch/roles.ts";

const CENSUS: readonly CensusEntry[] = [
  {
    route: "/settings",
    classification: {
      kind: "prefetch",
      helper: "prefetchAccountSettings",
      module: SETTINGS_ACCOUNT,
      gate: "enforceRouteAccess",
    },
  },
  {
    route: "/settings/api-tokens",
    classification: {
      kind: "prefetch",
      helper: "prefetchUserApiTokens",
      module: SETTINGS_PREFETCH,
      gate: "settings:api-tokens:read",
    },
  },
  {
    route: "/settings/audit-log",
    classification: {
      kind: "prefetch",
      helper: "prefetchSettingsAuditLog",
      module: SETTINGS_ADMIN,
      gate: "audit-log:read",
    },
  },
  {
    route: "/settings/billing",
    classification: {
      kind: "prefetch",
      helper: "prefetchBillingSettings",
      module: SETTINGS_BILLING,
      gate: "billing:subscription:view",
    },
  },
  {
    route: "/settings/billing/ai-credits",
    classification: {
      kind: "prefetch",
      helper: "prefetchAiCreditsSettings",
      module: SETTINGS_BILLING,
      gate: "billing:ai-credits:view",
    },
  },
  {
    route: "/settings/delegations",
    classification: {
      kind: "prefetch",
      helper: "prefetchSettingsDelegations",
      module: SETTINGS_ADMIN,
      gate: "settings:rbac:manage",
    },
  },
  {
    route: "/settings/incoming-transfer",
    classification: {
      kind: "no-prefetch",
      reason:
        "useIncomingOrgTransfers declares staleTime 0 and refetchOnMount \"always\", so a hydrated pending transfer would be re-read on the first mount anyway. A stale accept/decline offer is the one thing this page must not show, and relaxing that policy to make a prefetch stick is a behaviour change, not an optimisation.",
      evidence: "hooks/api/ownership.ts",
    },
  },
  {
    route: "/settings/modules",
    classification: {
      kind: "prefetch",
      helper: "prefetchOrgModules",
      module: SETTINGS_ADMIN,
      gate: "settings:manage",
    },
  },
  {
    route: "/settings/organization",
    classification: {
      kind: "prefetch",
      helper: "prefetchOrgSettings",
      module: SETTINGS_PREFETCH,
      gate: "settings:view",
    },
  },
  {
    route: "/settings/organization/branches",
    classification: {
      kind: "prefetch",
      helper: "prefetchOrgBranches",
      module: SETTINGS_PREFETCH,
      gate: "settings:view",
    },
  },
  {
    route: "/settings/organization/business-units",
    classification: {
      kind: "prefetch",
      helper: "prefetchBusinessUnits",
      module: SETTINGS_PREFETCH,
      gate: "settings:view",
    },
  },
  {
    route: "/settings/organization/chart",
    classification: {
      kind: "prefetch",
      helper: "prefetchOrgTree",
      module: SETTINGS_PREFETCH,
      gate: "settings:view",
    },
  },
  {
    route: "/settings/organization/cost-centers",
    classification: {
      kind: "prefetch",
      helper: "prefetchOrgCostCenters",
      module: SETTINGS_PREFETCH,
      gate: "settings:view",
    },
  },
  {
    route: "/settings/organization/departments",
    classification: {
      kind: "prefetch",
      helper: "prefetchOrgDepartments",
      module: SETTINGS_PREFETCH,
      gate: "settings:view",
    },
  },
  {
    route: "/settings/organization/locations",
    classification: {
      kind: "prefetch",
      helper: "prefetchOrgLocations",
      module: SETTINGS_PREFETCH,
      gate: "settings:view",
    },
  },
  {
    route: "/settings/organization/structure",
    classification: {
      kind: "prefetch",
      helper: "prefetchOrgStructure",
      module: SETTINGS_PREFETCH,
      gate: "settings:view",
    },
  },
  {
    route: "/settings/organization/teams",
    classification: {
      kind: "prefetch",
      helper: "prefetchOrgTeams",
      module: SETTINGS_PREFETCH,
      gate: "settings:view",
    },
  },
  {
    route: "/settings/roles",
    classification: {
      kind: "prefetch",
      helper: "prefetchRoles",
      module: ROLES_PREFETCH,
      gate: "settings:rbac:manage",
    },
  },
  {
    route: "/settings/roles/1",
    classification: {
      kind: "prefetch",
      helper: "prefetchRoleDetail",
      module: SETTINGS_PREFETCH,
      gate: "settings:rbac:manage",
    },
  },
  {
    route: "/settings/roles/audit",
    classification: {
      kind: "prefetch",
      helper: "prefetchRolesAudit",
      module: SETTINGS_ADMIN,
      gate: "audit-log:read",
    },
  },
  {
    route: "/settings/roles/simulate",
    classification: {
      kind: "prefetch",
      helper: "prefetchRoleSimulation",
      module: SETTINGS_ADMIN,
      gate: "settings:rbac:manage",
    },
  },
  {
    route: "/settings/users",
    classification: {
      kind: "prefetch",
      helper: "prefetchSettingsUsers",
      module: SETTINGS_ADMIN,
      gate: "settings:view",
    },
  },
  {
    route: "/settings/webhooks",
    classification: {
      kind: "prefetch",
      helper: "prefetchSettingsWebhooks",
      module: SETTINGS_ADMIN,
      gate: "settings:webhooks:manage",
    },
  },
];

function settingsRoutes(): ReadonlyArray<{ path: string; file: string }> {
  return collectAppRoutes("(authenticated)").filter(
    (route) => route.path === "/settings" || route.path.startsWith("/settings/"),
  );
}

function pageSource(routePath: string): string {
  const route = settingsRoutes().find((entry) => entry.path === routePath);
  if (!route) throw new Error(`no page file for ${routePath}`);
  return readFileSync(join(APP_DIR, route.file), "utf8");
}

function moduleSource(relative: string): string {
  return readFileSync(join(FRONTEND_ROOT, relative), "utf8");
}

describe("the settings prefetch census", () => {
  const routes = settingsRoutes();

  it("reads real route files, so an empty sweep cannot pass", () => {
    expect(routes.length).toBe(23);
    expect(backendPermissionNames().size).toBeGreaterThan(400);
  });

  it("classifies every settings route on disk", () => {
    const classified = new Set(CENSUS.map((entry) => entry.route));
    const unclassified = routes
      .map((route) => route.path)
      .filter((path) => !classified.has(path))
      .sort();

    expect(unclassified).toEqual([]);
  });

  it("keeps the census live — no entry that matches no route", () => {
    const live = new Set(routes.map((route) => route.path));
    const stale = CENSUS.map((entry) => entry.route)
      .filter((path) => !live.has(path))
      .sort();

    expect(stale).toEqual([]);
  });

  it("classifies each route exactly once", () => {
    expect(new Set(CENSUS.map((entry) => entry.route)).size).toBe(CENSUS.length);
  });
});

describe("a prefetch classification is backed by real wiring", () => {
  const prefetched = CENSUS.filter(
    (entry): entry is CensusEntry & { classification: Extract<Classification, { kind: "prefetch" }> } =>
      entry.classification.kind === "prefetch",
  );

  it("covers 22 of the 23 routes", () => {
    expect(prefetched).toHaveLength(22);
  });

  it.each(prefetched.map((entry) => [entry.route, entry] as const))(
    "%s calls its named helper and mounts a HydrationBoundary over the result",
    (route, entry) => {
      const source = pageSource(route);
      const { helper } = entry.classification;

      expect([route, source.includes(`${helper}(`)]).toEqual([route, true]);
      expect([route, /<HydrationBoundary state=\{state\}>/.test(source)]).toEqual([
        route,
        true,
      ]);
    },
  );

  it.each(prefetched.map((entry) => [entry.route, entry] as const))(
    "%s names a helper that its module really exports",
    (route, entry) => {
      const { helper, module } = entry.classification;
      const source = moduleSource(module);

      expect([route, source.includes(`export async function ${helper}(`)]).toEqual([
        route,
        true,
      ]);
    },
  );

  it.each(prefetched.map((entry) => [entry.route, entry] as const))(
    "%s gates the prefetch behind the route's own server check",
    (route, entry) => {
      const source = pageSource(route);
      const { gate, helper } = entry.classification;

      const gateCall =
        gate === "enforceRouteAccess"
          ? source.indexOf("enforceRouteAccess(")
          : source.indexOf(`requirePermission("${gate}")`);
      expect([route, gateCall]).not.toEqual([route, -1]);
      expect([route, gateCall < source.indexOf(`${helper}(`)]).toEqual([route, true]);
    },
  );

  it("asserts only permission keys that exist verbatim in the backend catalog", () => {
    const names = backendPermissionNames();
    const unknown = prefetched
      .map((entry) => entry.classification.gate)
      .filter((gate) => gate !== "enforceRouteAccess")
      .filter((gate) => !names.has(gate));

    expect(unknown).toEqual([]);
  });

  it("every prefetch module resolves its gate before issuing a protected read", () => {
    for (const relative of [SETTINGS_ADMIN, SETTINGS_BILLING]) {
      const source = moduleSource(relative);
      expect([relative, source.includes("resolvePrefetchGate")]).toEqual([relative, true]);
    }
  });
});

describe("a no-prefetch classification is backed by the policy that makes it one", () => {
  const skipped = CENSUS.filter(
    (entry): entry is CensusEntry & { classification: Extract<Classification, { kind: "no-prefetch" }> } =>
      entry.classification.kind === "no-prefetch",
  );

  it("is exactly one route", () => {
    expect(skipped.map((entry) => entry.route)).toEqual(["/settings/incoming-transfer"]);
  });

  it.each(skipped.map((entry) => [entry.route, entry] as const))(
    "%s states a real reason and mounts no HydrationBoundary",
    (route, entry) => {
      const source = pageSource(route);

      expect(entry.classification.reason.length).toBeGreaterThan(80);
      expect([route, source.includes("HydrationBoundary")]).toEqual([route, false]);
    },
  );

  it("the incoming-transfer read still declares the policy the classification rests on", () => {
    const source = moduleSource("hooks/api/ownership.ts");
    const hook = source.slice(source.indexOf("export function useIncomingOrgTransfers"));
    const body = hook.slice(0, hook.indexOf("\n}"));

    expect(body).toContain("staleTime: 0");
    expect(body).toContain('refetchOnMount: "always"');
  });
});
