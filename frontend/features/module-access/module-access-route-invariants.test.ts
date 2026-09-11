import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCESS_MANAGED_MODULES } from "@/lib/rbac/permissions/module-access";

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

const ACCESS_ROUTES = ACCESS_MANAGED_MODULES.filter(
  (moduleKey) => NO_ACCESS_PAGE[moduleKey] === undefined,
);

function pagePath(moduleKey: string): string {
  return join(
    process.cwd(),
    "app",
    "(authenticated)",
    moduleKey,
    "access",
    "page.tsx",
  );
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
      expect(source).toContain(
        `await requirePermission("${moduleKey}:access:view");`,
      );
      expect(source).toContain(`<ModuleAccessPage moduleKey="${moduleKey}"`);
      expect(source).not.toContain("OwnershipSection");
      expect(source).not.toContain("ModuleMembersTab");
      expect(source).not.toContain("RolesTab");
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

  it("an exemption states why, at length", () => {
    const thin = Object.entries(NO_ACCESS_PAGE)
      .filter(([, reason]) => reason.length < 80)
      .map(([moduleKey]) => moduleKey);
    expect(thin).toEqual([]);
  });
});
