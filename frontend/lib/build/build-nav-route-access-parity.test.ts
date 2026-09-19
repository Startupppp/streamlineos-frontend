import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";
import { buildScopeCatalog, splitDestinationHref } from "./build-nav-model";
import { BUILD_MY_WORK_DESTINATIONS } from "./nav/build-stable-destinations";
import { resolveBuildScope } from "./build-scope";
import type { BuildNavDestination } from "./nav/build-nav-destination";
import type { PermissionKey } from "@/lib/rbac/permissions";

const SCOPE_PATHS = [
  "/build",
  "/build/workspaces/ws-1",
  "/build/managed-products/7",
  "/build/42",
];

function keysOf(
  requirement: PermissionKey | PermissionKey[],
): PermissionKey[] {
  return Array.isArray(requirement) ? requirement : [requirement];
}

function everyBuildDestination(): BuildNavDestination[] {
  const seen = new Set<string>();
  const all: BuildNavDestination[] = [];
  for (const destination of BUILD_MY_WORK_DESTINATIONS) {
    seen.add(destination.id);
    all.push(destination);
  }
  for (const path of SCOPE_PATHS) {
    const catalog = buildScopeCatalog(resolveBuildScope(path));
    const entries = [
      ...catalog.primary,
      ...catalog.moreTools,
      ...(catalog.settings ? [catalog.settings] : []),
    ];
    for (const destination of entries) {
      if (seen.has(destination.id)) continue;
      seen.add(destination.id);
      all.push(destination);
    }
  }
  return all;
}

const destinations = everyBuildDestination();

function drifted(): string[] {
  const found: string[] = [];
  for (const destination of destinations) {
    const { path } = splitDestinationHref(destination.href);
    const decision = resolveRouteAccess(path);
    if (decision.kind !== "permission") continue;
    const routeKeys = decision.permission ? keysOf(decision.permission) : [];
    if (routeKeys.length === 0) continue;
    const navKeys = new Set<string>(keysOf(destination.requiredPermission));
    if (routeKeys.every((key) => !navKeys.has(key)))
      found.push(`${destination.id} -> ${path}`);
  }
  return found.sort();
}

const KNOWN_KEY_DRIFT: readonly string[] = [
  "project-analytics -> /build/42/analytics",
  "project-backlog -> /build/42/backlog",
  "project-chat -> /build/42/chat",
  "project-epics -> /build/42/epics",
  "project-intake -> /build/42/intake",
  "project-issues -> /build/42",
  "project-milestones -> /build/42/milestones",
  "project-reports -> /build/42/reports",
  "project-timeline -> /build/42/timeline",
  "project-triage -> /build/42/triage",
  "project-views -> /build/42/views",
  "project-webhooks -> /build/42/webhooks",
  "project-whiteboard -> /build/42/whiteboard",
  "project-wiki -> /build/42/wiki",
  "project-workflow -> /build/42/workflow",
  "project-workload -> /build/42",
  "project-ai -> /build/42/ai",
  "project-releases -> /build/42/releases",
  "workspace-work -> /build/workspaces/ws-1/all-work",
].toSorted();

describe("every Build navigation destination is reachable by its own key", () => {
  it("covers a non-trivial number of destinations, so a catalog that stopped loading cannot pass vacuously", () => {
    expect(destinations.length).toBeGreaterThan(30);
  });

  it("resolves every destination href to a registered route, so none falls through to access-denied", () => {
    const unregistered = destinations
      .map((destination) => splitDestinationHref(destination.href).path)
      .filter((path) => resolveRouteAccess(path).kind === "unknown");
    expect(unregistered).toEqual([]);
  });

  it("adds no destination whose sidebar key and route key disagree", () => {
    expect(drifted()).toEqual(KNOWN_KEY_DRIFT);
  });

  it("keeps no known-drift entry that has since been aligned", () => {
    const live = new Set(drifted());
    expect(KNOWN_KEY_DRIFT.filter((entry) => !live.has(entry))).toEqual([]);
  });
});
