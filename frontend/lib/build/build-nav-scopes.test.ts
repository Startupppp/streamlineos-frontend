import type { PermissionKey } from "@/lib/rbac/permissions";
import {
  countBuildScopePins,
  resolveAuthorizedToolIds,
  resolveBuildNavModel,
} from "./build-nav-model";
import {
  BUILD_NAV_MAX_PINS,
  type BuildNavAccess,
  type BuildNavCapability,
} from "./nav/build-nav-destination";
import { resolveBuildScope } from "./build-scope";

function accessWith(
  keys: PermissionKey[],
  modules: Record<string, boolean> = {},
  capabilities: Partial<Record<BuildNavCapability, boolean>> = {},
): BuildNavAccess {
  const keySet = new Set<PermissionKey>(keys);
  return {
    can: (key) => keySet.has(key),
    isOrgModuleEnabled: (module) => modules[module] ?? false,
    isCapabilityEnabled: (capability) => capabilities[capability] ?? true,
  };
}



const ALL_BUILD_PERMISSIONS: PermissionKey[] = [
  "build:view",
  "build:create",
  "build:update",
  "build:manage",
  "build:tickets:view",
  "build:tickets:create",
  "build:managed-products:view",
  "build:managed-products:create",
  "build:portfolios:view",
  "build:programs:view",
  "build:teams:view",
  "build:workspaces:view",
  "build:roadmap:view",
  "build:goals:view",
  "build:approvals:view",
  "build:customers:view",
  "build:portal:view",
  "build:members:view",
  "build:access:view",
  "build:sprints:view",
  "build:qa:view",
  "build:bugs:view",
  "build:incidents:view",
  "build:changerequests:view",
  "build:meetings:view",
  "build:risks:view",
  "build:decisions:view",
  "build:forms:view",
  "build:workflow:view",
  "build:clientvisibility:manage",
  "build:ai:use",
  "integrations:git:view",
  "feedbucket:submissions:view",
  "feedbucket:widgets:view",
];


describe("client portal capability gate", () => {
  const projectScope = resolveBuildScope("/build/42");
  const portalKeys: PermissionKey[] = [
    "build:tickets:view",
    "build:clientvisibility:manage",
  ];

  function portalDestination(capabilityEnabled: boolean | undefined) {
    const capabilities =
      capabilityEnabled === undefined ? {} : { "client-portal": capabilityEnabled };
    const model = resolveBuildNavModel({
      scope: projectScope,
      access: accessWith(portalKeys, {}, capabilities),
      pinnedIds: [],
    });
    return model.primary.find(
      (destination) => destination.id === "project-client-portal",
    );
  }

  it("shows client portal when the project capability is enabled", () => {
    expect(portalDestination(true)).toBeDefined();
  });

  it("hides client portal when the project capability is disabled even though the permission is held", () => {
    expect(portalDestination(false)).toBeUndefined();
  });

  it("keeps client portal visible for projects that never recorded the capability flag", () => {
    expect(portalDestination(undefined)).toBeDefined();
  });

  it("hides client portal when the capability is enabled but the permission is absent", () => {
    const model = resolveBuildNavModel({
      scope: projectScope,
      access: accessWith(["build:tickets:view"], {}, { "client-portal": true }),
      pinnedIds: [],
    });
    expect(
      model.primary.find((d) => d.id === "project-client-portal"),
    ).toBeUndefined();
  });
});

describe("countBuildScopePins", () => {
  it("does not let a pin the actor cannot see consume one of the three slots", () => {
    const stored = ["project-budget", "project-qa"];
    const authorized = ["project-qa"];
    expect(countBuildScopePins(stored, authorized)).toBe(1);
  });

  it("ignores pins belonging to another scope", () => {
    expect(countBuildScopePins(["org-roadmap"], ["project-qa"])).toBe(0);
  });

  it("counts every authorized pin", () => {
    const ids = ["project-qa", "project-bugs", "project-risks"];
    expect(countBuildScopePins(ids, ids)).toBe(BUILD_NAV_MAX_PINS);
  });
});

describe("resolveAuthorizedToolIds", () => {
  it("returns only tools the actor may open, so the pin ceiling counts real slots", () => {
    const ids = resolveAuthorizedToolIds(
      resolveBuildScope("/build/42"),
      accessWith(["build:qa:view"]),
    );
    expect(ids).toContain("project-qa");
    expect(ids).not.toContain("project-budget");
  });
});

describe("workspace and product scope catalogs", () => {
  const workspaceScope = resolveBuildScope("/build/workspaces/ws-1");
  const productScope = resolveBuildScope("/build/managed-products/7");
  const fullAccess = accessWith(ALL_BUILD_PERMISSIONS, { feedbucket: true });

  it("exposes workspace Projects, Products, Teams and All work under the workspace base path", () => {
    const model = resolveBuildNavModel({
      scope: workspaceScope,
      access: fullAccess,
      pinnedIds: [],
    });
    expect(model.primary.map((d) => d.href)).toEqual([
      "/build/workspaces/ws-1",
      "/build/workspaces/ws-1/products",
      "/build/workspaces/ws-1/teams",
      "/build/workspaces/ws-1/all-work",
    ]);
  });

  it("labels the workspace base path Projects rather than Overview, because it renders the project list", () => {
    const model = resolveBuildNavModel({
      scope: workspaceScope,
      access: fullAccess,
      pinnedIds: [],
    });
    const root = model.primary.find((d) => d.href === "/build/workspaces/ws-1");
    expect(root?.label).toBe("Projects");
  });

  it("hides workspace Products from a caller without the managed-product read key", () => {
    const model = resolveBuildNavModel({
      scope: workspaceScope,
      access: accessWith(["build:view", "build:teams:view"]),
      pinnedIds: [],
    });
    const ids = model.primary.map((d) => d.id);
    expect(ids).not.toContain("workspace-products");
    expect(ids).toContain("workspace-teams");
  });

  it("exposes Linked projects under the managed product base path", () => {
    const model = resolveBuildNavModel({
      scope: productScope,
      access: fullAccess,
      pinnedIds: [],
    });
    expect(model.primary.map((d) => d.href)).toEqual([
      "/build/managed-products/7",
      "/build/managed-products/7/projects",
    ]);
  });

  it("keeps every workspace and product destination inside its own scope base path", () => {
    for (const scope of [workspaceScope, productScope]) {
      const model = resolveBuildNavModel({
        scope,
        access: fullAccess,
        pinnedIds: [],
      });
      for (const destination of model.primary)
        expect(
          destination.href === scope.basePath ||
            destination.href.startsWith(`${scope.basePath}/`),
        ).toBe(true);
    }
  });
});
