import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCESS_MANAGED_MODULES } from "@/lib/rbac/permissions/module-access";
import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";

/**
 * Modules whose access ladder the backend delegates but which have no
 * `/<module>/access` page, each with the reason it does not.
 *
 * This list is the whole of the exemption. Before it existed the covered set
 * was ten hand-written names against the backend's fourteen delegable modules,
 * so `blog`, `directory` and `workflows` had conforming pages that nothing
 * checked and `feedbucket` had no page at all — and neither fact was visible
 * from this file.
 */
const NO_ACCESS_PAGE: Readonly<Record<string, string>> = {
  feedbucket:
    "route: null in the backend module registry — feedbucket owns no product surface of its own (it renders inside /build/[projectId]/feedbucket), so there is no page to hang an access screen off. The backend still seeds FEEDBUCKET_MODULE_ADMIN/OWNER/MEMBER and generates feedbucket:access:view|manage, so this organisation cannot administer feedbucket access from the UI at all. Placement is a product decision, not a missing file.",
};

interface RelocatedAccessPage {
  readonly segments: readonly string[];
  readonly route: string;
  readonly reason: string;
}

const RELOCATED_ACCESS_PAGE: Readonly<Record<string, RelocatedAccessPage>> = {
  build: {
    segments: ["build", "settings", "access"],
    route: "/build/settings/access",
    reason:
      "Build administers membership and module access from one organisation-scoped settings surface, so its access screen sits at /build/settings/access beside /build/settings/client-access and /build/settings/integrations rather than at /build/access. Recorded in docs/build-module/01-ia-navigation.md:66,155 and docs/specs/build/module/02a-cross-scope-pages-prd.md:45. The legacy /build/access path survives only as a next.config redirect, which Next.js resolves before filesystem routing.",
  },
};

const ACCESS_ROUTES = ACCESS_MANAGED_MODULES.filter(
  (moduleKey) => NO_ACCESS_PAGE[moduleKey] === undefined,
);

const RELOCATED_MODULES = ACCESS_ROUTES.filter(
  (moduleKey) => RELOCATED_ACCESS_PAGE[moduleKey] !== undefined,
);

const IN_PLACE_MODULES = ACCESS_ROUTES.filter(
  (moduleKey) => RELOCATED_ACCESS_PAGE[moduleKey] === undefined,
);

function legacyPagePath(moduleKey: string): string {
  return join(
    process.cwd(),
    "app",
    "(authenticated)",
    moduleKey,
    "access",
    "page.tsx",
  );
}

function pagePath(moduleKey: string): string {
  const relocation = RELOCATED_ACCESS_PAGE[moduleKey];
  if (relocation === undefined) return legacyPagePath(moduleKey);
  return join(
    process.cwd(),
    "app",
    "(authenticated)",
    ...relocation.segments,
    "page.tsx",
  );
}

function resolvedPermissionKeys(route: string): string[] {
  const decision = resolveRouteAccess(route);
  if (decision.kind !== "permission" || decision.permission === null) return [];
  return Array.isArray(decision.permission)
    ? [...decision.permission]
    : [decision.permission];
}

describe("module access route policy", () => {
  it("covers a real set — the invariant is not vacuous", () => {
    expect(ACCESS_ROUTES.length).toBeGreaterThanOrEqual(13);
  });

  it.each(ACCESS_ROUTES)(
    "%s delegates authorization UX to the shared ModuleAccessPage",
    (moduleKey) => {
      const source = readFileSync(pagePath(moduleKey), "utf8");

      expect(source).toContain(
        'import { ModuleAccessPage } from "@/features/module-access/module-access-page";',
      );
      expect(source).toContain(`<ModuleAccessPage moduleKey="${moduleKey}"`);
      expect(source).not.toContain("OwnershipSection");
      expect(source).not.toContain("ModuleMembersTab");
      expect(source).not.toContain("RolesTab");
    },
  );

  it.each(IN_PLACE_MODULES)(
    "%s gates its access page on the module access-view permission",
    (moduleKey) => {
      expect(readFileSync(pagePath(moduleKey), "utf8")).toContain(
        `await requirePermission("${moduleKey}:access:view");`,
      );
    },
  );

  it.each(RELOCATED_MODULES)(
    "%s gates its relocated access page on a route that still resolves to the module access-view permission, so moving the page cannot widen the gate",
    (moduleKey) => {
      const relocation = RELOCATED_ACCESS_PAGE[moduleKey];
      const source = readFileSync(pagePath(moduleKey), "utf8");

      expect(source).toContain(
        `await enforceRouteAccess("${relocation.route}");`,
      );
      expect(resolvedPermissionKeys(relocation.route)).toContain(
        `${moduleKey}:access:view`,
      );
    },
  );

  it("every delegable module has an access page or a recorded reason it does not", () => {
    const unexplained = ACCESS_MANAGED_MODULES.filter(
      (moduleKey) =>
        NO_ACCESS_PAGE[moduleKey] === undefined && !existsSync(pagePath(moduleKey)),
    );
    expect(unexplained).toEqual([]);
  });

  it("no exemption outlives the gap it describes", () => {
    const stale = Object.keys(NO_ACCESS_PAGE).filter(
      (moduleKey) =>
        !ACCESS_MANAGED_MODULES.includes(
          moduleKey as (typeof ACCESS_MANAGED_MODULES)[number],
        ) || existsSync(pagePath(moduleKey)),
    );
    expect(stale).toEqual([]);
  });

  it("a relocated module keeps no page at the legacy access path, so the move completed instead of leaving two access screens", () => {
    const duplicated = Object.keys(RELOCATED_ACCESS_PAGE).filter((moduleKey) =>
      existsSync(legacyPagePath(moduleKey)),
    );
    expect(duplicated).toEqual([]);
  });

  it("no relocation outlives the module it describes", () => {
    const stale = Object.keys(RELOCATED_ACCESS_PAGE).filter(
      (moduleKey) =>
        !ACCESS_MANAGED_MODULES.includes(
          moduleKey as (typeof ACCESS_MANAGED_MODULES)[number],
        ) || NO_ACCESS_PAGE[moduleKey] !== undefined,
    );
    expect(stale).toEqual([]);
  });

  it("a relocation states why, at length", () => {
    const thin = Object.entries(RELOCATED_ACCESS_PAGE)
      .filter(([, relocation]) => relocation.reason.length < 80)
      .map(([moduleKey]) => moduleKey);
    expect(thin).toEqual([]);
  });

  it("an exemption states why, at length", () => {
    const thin = Object.entries(NO_ACCESS_PAGE)
      .filter(([, reason]) => reason.length < 80)
      .map(([moduleKey]) => moduleKey);
    expect(thin).toEqual([]);
  });
});
