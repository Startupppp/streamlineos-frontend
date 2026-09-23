import { Users } from "lucide-react";
import type { PermissionKey } from "@/lib/rbac/permissions";
import {
  buildScopeCatalog,
  isBuildDestinationActive,
  resolveBuildNavModel,
} from "./build-nav-model";
import {
  BUILD_NAV_MAX_PINS,
  BUILD_NAV_MAX_PRIMARY,
  type BuildNavAccess,
  type BuildNavCapability,
  type BuildNavDestination,
} from "./nav/build-nav-destination";
import { buildOrganizationNavGroups, toBuildNavGroups } from "./build-nav-groups";
import { ORGANIZATION_BUILD_SCOPE, resolveBuildScope } from "./build-scope";

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

function toPermissionKeys(
  requirement: PermissionKey | PermissionKey[] | undefined,
): PermissionKey[] {
  if (!requirement) return [];
  return Array.isArray(requirement) ? requirement : [requirement];
}

function requireDestination(
  destinations: BuildNavDestination[],
  id: string,
): BuildNavDestination {
  const found = destinations.find((d) => d.id === id);
  if (!found) throw new Error(`Destination "${id}" not found in the provided list`);
  return found;
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
  "build:updates:view",
  "build:files:view",
  "integrations:git:view",
  "feedbucket:submissions:view",
  "feedbucket:widgets:view",
];

const projectScope = resolveBuildScope("/build/42");
const orgScope = ORGANIZATION_BUILD_SCOPE;
const projectCatalog = buildScopeCatalog(projectScope);

describe("resolveBuildNavModel — permission filtering", () => {
  it("exposes all three myWork entries and project Issues + Backlog when the only held key is build:tickets:view", () => {
    const model = resolveBuildNavModel({
      scope: projectScope,
      access: accessWith(["build:tickets:view"]),
      pinnedIds: [],
    });
    expect(model.myWork).toHaveLength(3);
    const primaryIds = model.primary.map((d) => d.id);
    expect(primaryIds).toContain("project-issues");
    expect(primaryIds).toContain("project-backlog");
  });

  it("excludes org-products from primary when the caller lacks build:managed-products:view", () => {
    const model = resolveBuildNavModel({
      scope: orgScope,
      access: accessWith(["build:tickets:view"]),
      pinnedIds: [],
    });
    const hrefs = model.primary.map((d) => d.href);
    expect(hrefs).not.toContain("/build/managed-products");
  });
});

describe("resolveBuildNavModel — org module filtering", () => {
  it("hides the Feedback tool from moreTools when feedbucket is disabled even if the permission is held", () => {
    const model = resolveBuildNavModel({
      scope: projectScope,
      access: accessWith(ALL_BUILD_PERMISSIONS, { feedbucket: false }),
      pinnedIds: [],
    });
    expect(model.moreTools.some((d) => d.id === "project-feedback")).toBe(false);
  });

  it("includes the Feedback tool in moreTools when feedbucket is enabled and permission is held", () => {
    const model = resolveBuildNavModel({
      scope: projectScope,
      access: accessWith(ALL_BUILD_PERMISSIONS, { feedbucket: true }),
      pinnedIds: [],
    });
    expect(model.moreTools.some((d) => d.id === "project-feedback")).toBe(true);
  });
});

describe("resolveBuildNavModel — scope separation", () => {
  it("all project-scope primary hrefs are under the project base path so no org-scope href leaks in", () => {
    const model = resolveBuildNavModel({
      scope: projectScope,
      access: accessWith(ALL_BUILD_PERMISSIONS, { feedbucket: true }),
      pinnedIds: [],
    });
    for (const destination of model.primary) {
      expect(
        destination.href === "/build/42" || destination.href.startsWith("/build/42/"),
      ).toBe(true);
    }
  });

  it("no org-scope primary href contains a project-id numeric segment so project-scope hrefs never appear there", () => {
    const model = resolveBuildNavModel({
      scope: orgScope,
      access: accessWith(ALL_BUILD_PERMISSIONS, { feedbucket: true }),
      pinnedIds: [],
    });
    for (const destination of model.primary) {
      expect(/^\/build\/\d+/.test(destination.href)).toBe(false);
    }
  });
});

describe("resolveBuildNavModel — primary destination ceiling", () => {
  it("never produces more than BUILD_NAV_MAX_PRIMARY primary destinations for a fully-permissioned caller across all scope types", () => {
    const access = accessWith(ALL_BUILD_PERMISSIONS, { feedbucket: true });
    const scopes = [
      orgScope,
      projectScope,
      resolveBuildScope("/build/managed-products/7"),
    ];
    for (const scope of scopes) {
      const { primary } = resolveBuildNavModel({ scope, access, pinnedIds: [] });
      expect(primary.length).toBeLessThanOrEqual(BUILD_NAV_MAX_PRIMARY);
    }
  });
});

describe("resolveBuildNavModel — pin resolution", () => {
  const access = accessWith(ALL_BUILD_PERMISSIONS, { feedbucket: true });

  it("resolves pinned ids from the active scope's moreTools preserving the stored order", () => {
    const model = resolveBuildNavModel({
      scope: projectScope,
      access,
      pinnedIds: ["project-triage", "project-epics"],
    });
    expect(model.pinned.map((d) => d.id)).toEqual(["project-triage", "project-epics"]);
  });

  it("ignores a pinned id from a different scope's moreTools because it does not exist in the active scope", () => {
    const model = resolveBuildNavModel({
      scope: projectScope,
      access,
      pinnedIds: ["org-roadmap", "project-triage"],
    });
    const pinnedIds = model.pinned.map((d) => d.id);
    expect(pinnedIds).not.toContain("org-roadmap");
    expect(pinnedIds).toContain("project-triage");
  });

  it("resolves no pins when none are stored, so an unpinned actor sees no pin group", () => {
    const model = resolveBuildNavModel({ scope: projectScope, access, pinnedIds: [] });
    expect(model.pinned).toEqual([]);
  });

  it("resolves exactly one pin when one is stored", () => {
    const model = resolveBuildNavModel({
      scope: projectScope,
      access,
      pinnedIds: ["project-triage"],
    });
    expect(model.pinned.map((d) => d.id)).toEqual(["project-triage"]);
  });

  it("resolves exactly three pins when three are stored, so the ceiling does not truncate a legal set", () => {
    const model = resolveBuildNavModel({
      scope: projectScope,
      access,
      pinnedIds: ["project-triage", "project-epics", "project-milestones"],
    });
    expect(model.pinned.map((d) => d.id)).toEqual([
      "project-triage",
      "project-epics",
      "project-milestones",
    ]);
  });

  it("resolves at most BUILD_NAV_MAX_PINS pins and honours the stored order when more ids are provided", () => {
    const model = resolveBuildNavModel({
      scope: projectScope,
      access,
      pinnedIds: ["project-triage", "project-epics", "project-milestones", "project-workload"],
    });
    expect(model.pinned.length).toBe(BUILD_NAV_MAX_PINS);
    expect(model.pinned[0].id).toBe("project-triage");
    expect(model.pinned[1].id).toBe("project-epics");
    expect(model.pinned[2].id).toBe("project-milestones");
  });
});

describe("isBuildDestinationActive — boardViews destination (project Issues)", () => {
  const issues = requireDestination(projectCatalog.primary, "project-issues");

  it("is active on the /issues path with no view parameter", () => {
    expect(isBuildDestinationActive(issues, "/build/42/issues", null)).toBe(true);
  });

  it("is active on the /issues path with view=board because board is in the allowed board views set", () => {
    expect(isBuildDestinationActive(issues, "/build/42/issues", "board")).toBe(true);
  });

  it("is active on the /issues path with view=workload because workload is a board view the issues page can render", () => {
    expect(isBuildDestinationActive(issues, "/build/42/issues", "workload")).toBe(true);
  });

  it("is inactive on the backlog path because the destination does not own /backlog", () => {
    expect(isBuildDestinationActive(issues, "/build/42/backlog", null)).toBe(false);
  });

});

describe("isBuildDestinationActive — project Workload owns a route rather than a view parameter", () => {
  const workload = requireDestination(projectCatalog.moreTools, "project-workload");

  it("is active on its own path regardless of the view parameter, because the href carries no view", () => {
    expect(isBuildDestinationActive(workload, "/build/42/workload", "workload")).toBe(true);
    expect(isBuildDestinationActive(workload, "/build/42/workload", null)).toBe(true);
  });

  it("is inactive on the project base path, so Overview and Workload are never both active", () => {
    expect(isBuildDestinationActive(workload, "/build/42", "workload")).toBe(false);
  });
});

describe("isBuildDestinationActive — a view-parameterised href still matches on the view", () => {
  const viewScoped: BuildNavDestination = {
    id: "project-workload",
    label: "Workload",
    href: "/build/42?view=workload",
    icon: Users,
    requiredPermission: "build:tickets:view",
  };

  it("is active only when the pathname matches and the view equals the encoded view", () => {
    expect(isBuildDestinationActive(viewScoped, "/build/42", "workload")).toBe(true);
  });

  it("is inactive when the view differs even on the same base path", () => {
    expect(isBuildDestinationActive(viewScoped, "/build/42", "board")).toBe(false);
  });

  it("is inactive when no view is present because the href encodes a required view", () => {
    expect(isBuildDestinationActive(viewScoped, "/build/42", null)).toBe(false);
  });
});

describe("isBuildDestinationActive — non-exact destination (project QA) owns its subtree", () => {
  const qa = requireDestination(projectCatalog.moreTools, "project-qa");

  it("is active on its own path", () => {
    expect(isBuildDestinationActive(qa, "/build/42/qa", null)).toBe(true);
  });

  it("is active on a deeper path because non-exact destinations own their subtree", () => {
    expect(isBuildDestinationActive(qa, "/build/42/qa/runs", null)).toBe(true);
  });

  it("is inactive on a sibling path that happens to share the parent prefix", () => {
    expect(isBuildDestinationActive(qa, "/build/42/bugs", null)).toBe(false);
  });
});

describe("resolveBuildNavModel — createActions", () => {
  const allCreateKeys: PermissionKey[] = [
    "build:tickets:create",
    "build:create",
    "build:managed-products:create",
  ];

  function actionIdsAt(path: string): string[] {
    return resolveBuildNavModel({
      scope: resolveBuildScope(path),
      access: accessWith(allCreateKeys),
      pinnedIds: [],
    }).createActions.map((action) => action.id);
  }

  it("offers Issue only at project scope, because no other scope names an unambiguous project", () => {
    expect(actionIdsAt("/build/42")).toContain("issue");
    expect(actionIdsAt("/build")).not.toContain("issue");
    expect(actionIdsAt("/build/managed-products/7")).not.toContain("issue");
  });

  it("offers Project at every scope", () => {
    for (const path of ["/build", "/build/managed-products/7", "/build/42"])
      expect(actionIdsAt(path)).toContain("project");
  });

  it("offers Product only at organization scope, never under a product or project, now that no workspace scope can own it", () => {
    expect(actionIdsAt("/build")).toContain("managed-product");
    expect(actionIdsAt("/build/managed-products/7")).not.toContain(
      "managed-product",
    );
    expect(actionIdsAt("/build/42")).not.toContain("managed-product");
  });

  it("still hides an action the caller lacks the create permission for", () => {
    const model = resolveBuildNavModel({
      scope: resolveBuildScope("/build/42"),
      access: accessWith(["build:create"]),
      pinnedIds: [],
    });
    const ids = model.createActions.map((action) => action.id);
    expect(ids).toEqual(["project"]);
  });

  it("omits the managed-product action at project scope even when build:managed-products:create is held", () => {
    const model = resolveBuildNavModel({
      scope: projectScope,
      access: accessWith(["build:tickets:create", "build:create", "build:managed-products:create"]),
      pinnedIds: [],
    });
    expect(model.createActions.map((a) => a.id)).not.toContain("managed-product");
  });

  it("includes the managed-product action at org scope when build:managed-products:create is held", () => {
    const model = resolveBuildNavModel({
      scope: orgScope,
      access: accessWith(["build:managed-products:create"]),
      pinnedIds: [],
    });
    expect(model.createActions.map((a) => a.id)).toContain("managed-product");
  });

  it("produces no actions when no create permissions are held", () => {
    const model = resolveBuildNavModel({
      scope: orgScope,
      access: accessWith(["build:tickets:view"]),
      pinnedIds: [],
    });
    expect(model.createActions).toHaveLength(0);
  });
});

describe("toBuildNavGroups", () => {
  const model = resolveBuildNavModel({
    scope: projectScope,
    access: accessWith(ALL_BUILD_PERMISSIONS, { feedbucket: true }),
    pinnedIds: [],
  });
  const groups = toBuildNavGroups(model);

  it("excludes view-parameterised destinations from the More-tools routes so no product path appears twice", () => {
    const moreGroup = groups.find((g) => g.label === "More tools");
    expect(moreGroup).toBeDefined();
    if (!moreGroup) return;
    const hasViewParam = moreGroup.routes.some((r) => r.href.includes("?view="));
    expect(hasViewParam).toBe(false);
  });

  it("orders the Project work group by mobilePriority: Overview, Issues, Assigned-to-me, Backlog are first four", () => {
    const projectGroup = groups.find((g) => g.label === "Project");
    expect(projectGroup).toBeDefined();
    if (!projectGroup) return;
    const first4 = projectGroup.routes.slice(0, 4).map((r) => r.href);
    expect(first4[0]).toBe("/build/42");
    expect(first4[1]).toBe("/build/42/issues");
    expect(first4[2]).toBe("/build/my-work");
    expect(first4[3]).toBe("/build/42/backlog");
  });
});

describe("buildOrganizationNavGroups", () => {
  const groups = buildOrganizationNavGroups();

  it("every route carries a requiredPermission so the sidebar-permission-coverage gate stays green", () => {
    const ungated = groups
      .flatMap((group) => group.routes)
      .filter((route) => !route.requiredPermission);
    expect(ungated).toHaveLength(0);
  });

  it("each group's requiredPermission array is a superset of all its routes' individual permission keys", () => {
    const violations: string[] = [];
    for (const group of groups) {
      const groupKeys = new Set(toPermissionKeys(group.requiredPermission));
      for (const route of group.routes) {
        for (const key of toPermissionKeys(route.requiredPermission)) {
          if (!groupKeys.has(key)) {
            violations.push(`group "${group.label}" route "${route.href}" missing key "${key}"`);
          }
        }
      }
    }
    expect(violations).toHaveLength(0);
  });

  it("gates the customers route on build:customers:view and not the retired crm:leads:view key", () => {
    const customersRoute = groups
      .flatMap((group) => group.routes)
      .find((route) => route.href === "/build/customers");
    expect(customersRoute).toBeDefined();
    if (!customersRoute) return;
    const keys = toPermissionKeys(customersRoute.requiredPermission);
    expect(keys).toContain("build:customers:view");
    expect(keys).not.toContain("crm:leads:view");
  });
});
