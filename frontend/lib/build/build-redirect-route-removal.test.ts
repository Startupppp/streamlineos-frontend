import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildScopeCatalog } from "./build-nav-model";
import { resolveBuildScope } from "./build-scope";
import {
  BUILD_BROWSE_ALL_DESTINATION,
  BUILD_MY_WORK_DESTINATIONS,
} from "./nav/build-stable-destinations";
import { BUILD_ROUTE_MANIFEST } from "./build-route-manifest";

const ROOT = process.cwd();
const APP_BUILD_DIR = resolve(ROOT, "app", "(authenticated)", "build");

interface RemovedRoute {
  route: string;
  appDir: string;
  redirectSource: string;
  redirectDestination: string;
}

const REMOVED_ROUTES: RemovedRoute[] = [
  {
    route: "/build/access",
    appDir: "access",
    redirectSource: "/build/access",
    redirectDestination: "/build/settings/access",
  },
  {
    route: "/build/members",
    appDir: "members",
    redirectSource: "/build/members",
    redirectDestination: "/build/settings/access",
  },
  {
    route: "/build/client-access",
    appDir: "client-access",
    redirectSource: "/build/client-access",
    redirectDestination: "/build/settings/client-access",
  },
  {
    route: "/build/drafts",
    appDir: "drafts",
    redirectSource: "/build/drafts",
    redirectDestination: "/build/inbox?view=drafts",
  },
  {
    route: "/build/[projectId]/workflow",
    appDir: join("[projectId]", "workflow"),
    redirectSource: "/build/:projectId(\\\\d+)/workflow",
    redirectDestination: "/build/:projectId/settings/workflow",
  },
  {
    route: "/build/[projectId]/automations",
    appDir: join("[projectId]", "automations"),
    redirectSource: "/build/:projectId(\\\\d+)/automations",
    redirectDestination: "/build/:projectId/settings/automations",
  },
  {
    route: "/build/[projectId]/webhooks",
    appDir: join("[projectId]", "webhooks"),
    redirectSource: "/build/:projectId(\\\\d+)/webhooks",
    redirectDestination: "/build/:projectId/settings/integrations/webhooks",
  },
  {
    route: "/build/[projectId]/sprints",
    appDir: join("[projectId]", "sprints"),
    redirectSource: "/build/:projectId(\\\\d+)/sprints",
    redirectDestination: "/build/:projectId/cycles",
  },
  {
    route: "/build/[projectId]/my-tickets",
    appDir: join("[projectId]", "my-tickets"),
    redirectSource: "/build/:projectId(\\\\d+)/my-tickets",
    redirectDestination: "/build/my-work?projectId=:projectId",
  },
  {
    route: "/build/workspaces/[pmWorkspaceId]/my-work",
    appDir: join("workspaces", "[pmWorkspaceId]", "my-work"),
    redirectSource: "/build/workspaces/:pmWorkspaceId/my-work",
    redirectDestination: "/build/my-work?pmWorkspaceId=:pmWorkspaceId",
  },
  {
    route: "/build/goal",
    appDir: "goal",
    redirectSource: "/build/goal",
    redirectDestination: "/build/goals",
  },
  {
    route: "/build/goal/[goalId]",
    appDir: join("goal", "[goalId]"),
    redirectSource: "/build/goal/:goalId(\\\\d+)",
    redirectDestination: "/build/goals/:goalId",
  },
  {
    route: "/build/pm-workspaces",
    appDir: "pm-workspaces",
    redirectSource: "/build/pm-workspaces",
    redirectDestination: "/build/workspaces",
  },
  {
    route: "/build/[projectId]/timeline",
    appDir: join("[projectId]", "timeline"),
    redirectSource: "/build/:projectId(\\\\d+)/timeline",
    redirectDestination: "/build/:projectId/issues?view=timeline",
  },
  {
    route: "/build/[projectId]/bugs",
    appDir: join("[projectId]", "bugs"),
    redirectSource: "/build/:projectId(\\\\d+)/bugs",
    redirectDestination: "/build/:projectId/issues?type=BUG",
  },
  {
    route: "/build/[projectId]/analytics",
    appDir: join("[projectId]", "analytics"),
    redirectSource: "/build/:projectId(\\\\d+)/analytics",
    redirectDestination: "/build/:projectId/reports?tab=overview",
  },
  {
    route: "/build/[projectId]/views",
    appDir: join("[projectId]", "views"),
    redirectSource: "/build/:projectId(\\\\d+)/views",
    redirectDestination: "/build/:projectId/issues",
  },
  {
    route: "/build/[projectId]/ai",
    appDir: join("[projectId]", "ai"),
    redirectSource: "/build/:projectId(\\\\d+)/ai",
    redirectDestination: "/build/command-center?projectId=:projectId",
  },
  {
    route: "/build/customers",
    appDir: "customers",
    redirectSource: "/build/customers",
    redirectDestination: "/crm",
  },
];

function nextConfigRedirects(): { source: string; destination: string }[] {
  const source = readFileSync(resolve(ROOT, "next.config.ts"), "utf8");
  return [
    ...source.matchAll(
      /source:\s*"([^"]+)",\s*(?:has:[\s\S]*?,\s*)?destination:\s*"([^"]+)"/g,
    ),
  ].map((match) => ({ source: match[1], destination: match[2] }));
}

function everyBuildNavHref(): string[] {
  const scopePaths = [
    "/build",
    "/build/workspaces/ws-1",
    "/build/managed-products/7",
    "/build/42",
  ];
  const hrefs = [
    ...BUILD_MY_WORK_DESTINATIONS.map((destination) => destination.href),
    BUILD_BROWSE_ALL_DESTINATION.href,
  ];
  for (const path of scopePaths) {
    const catalog = buildScopeCatalog(resolveBuildScope(path));
    hrefs.push(...catalog.primary.map((destination) => destination.href));
    hrefs.push(...catalog.moreTools.map((destination) => destination.href));
    if (catalog.settings) hrefs.push(catalog.settings.href);
  }
  return hrefs;
}

describe("removed Build redirect routes keep their deep link in next.config.ts", () => {
  it("covers every removed route, so a truncated list cannot pass vacuously", () => {
    expect(REMOVED_ROUTES).toHaveLength(19);
  });

  it.each(REMOVED_ROUTES)(
    "$route has no page.tsx on disk",
    ({ appDir }: RemovedRoute) => {
      expect(existsSync(join(APP_BUILD_DIR, appDir, "page.tsx"))).toBe(false);
    },
  );

  it.each(REMOVED_ROUTES)(
    "$route still redirects, so an existing bookmark is not broken by the deletion",
    ({ redirectSource, redirectDestination }: RemovedRoute) => {
      const match = nextConfigRedirects().find(
        (redirect) => redirect.source === redirectSource,
      );
      expect(match).toBeDefined();
      expect(match?.destination).toBe(redirectDestination);
    },
  );

  it.each(REMOVED_ROUTES)(
    "$route is absent from the route manifest, so no disposition outlives its page",
    ({ route }: RemovedRoute) => {
      expect(BUILD_ROUTE_MANIFEST.map((entry) => entry.route)).not.toContain(
        route,
      );
    },
  );

  it("no Build navigation destination points at a removed route", () => {
    const removed = new Set(REMOVED_ROUTES.map((entry) => entry.route));
    const offending = everyBuildNavHref().filter((href) => {
      const path = href.split("?")[0];
      const normalized = path
        .replace(/^\/build\/\d+/, "/build/[projectId]")
        .replace(/^\/build\/workspaces\/[^/]+/, "/build/workspaces/[pmWorkspaceId]");
      return removed.has(normalized);
    });
    expect(offending).toEqual([]);
  });

  it("every redirect destination inside Build resolves to a route the manifest still tracks", () => {
    const tracked = new Set(BUILD_ROUTE_MANIFEST.map((entry) => entry.route));
    const unresolved = REMOVED_ROUTES.filter((entry) => {
      const path = entry.redirectDestination.split("?")[0];
      if (!path.startsWith("/build")) return false;
      const normalized = path.replace(/:(\w+)/g, "[$1]");
      return !tracked.has(normalized);
    }).map((entry) => `${entry.route} -> ${entry.redirectDestination}`);
    expect(unresolved).toEqual([]);
  });

  it("every redirect destination that leaves Build still lands on a page that exists, so a cross-product handover cannot dangle", () => {
    const crossProduct = REMOVED_ROUTES.filter(
      (entry) => !entry.redirectDestination.split("?")[0].startsWith("/build"),
    );
    expect(crossProduct.length).toBeGreaterThan(0);
    const dangling = crossProduct.filter((entry) => {
      const path = entry.redirectDestination.split("?")[0];
      const segments = path.replace(/^\//, "").split("/");
      return !existsSync(
        join(resolve(ROOT, "app", "(authenticated)"), ...segments, "page.tsx"),
      );
    }).map((entry) => `${entry.route} -> ${entry.redirectDestination}`);
    expect(dangling).toEqual([]);
  });
});
