import {
  describeRouteAccess,
  resolveRouteAccess,
} from "@/lib/rbac/route-access/route-access";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { BUILD_ROUTE_MANIFEST } from "./build-route-manifest";

function concreteUrlFor(routePattern: string): string {
  return routePattern
    .replace(/\[ticketKey\]/g, "PRJ-1")
    .replace(/\[[^\]]+\]/g, "42");
}

function resolvedKeys(pathname: string): PermissionKey[] {
  const decision = resolveRouteAccess(pathname);
  if (decision.kind !== "permission" || !decision.permission) return [];
  return Array.isArray(decision.permission)
    ? decision.permission
    : [decision.permission];
}

type PermissionCase = [path: string, expectedKey: PermissionKey];

const PROJECT_CASES: PermissionCase[] = [
  ["/build/42/backlog", "build:tickets:view"],
  ["/build/42/epics", "build:tickets:view"],
  ["/build/42/triage", "build:tickets:view"],
  ["/build/42/workload", "build:tickets:view"],
  ["/build/42/settings/workflow", "build:update"],
  ["/build/42/settings/integrations/webhooks", "build:update"],
  ["/build/42/settings", "build:update"],
  ["/build/42/budget", "build:manage"],
  ["/build/42/client-portal", "build:clientvisibility:manage"],
  ["/build/42/feedbucket", "feedbucket:widgets:view"],
  ["/build/42/qa", "build:qa:view"],
  ["/build/42/incidents", "build:incidents:view"],
  ["/build/42/change-requests", "build:changerequests:view"],
  ["/build/42/approvals", "build:approvals:view"],
  ["/build/42/forms", "build:forms:view"],
  ["/build/42/risks", "build:risks:view"],
  ["/build/42/decisions", "build:decisions:view"],
  ["/build/42/meetings", "build:meetings:view"],
];

const ORG_CASES: PermissionCase[] = [
  ["/build/all-work", "build:tickets:view"],
  ["/build/managed-products", "build:managed-products:view"],
  ["/build/teams", "build:teams:view"],
  ["/portal", "build:portal:view"],
];

describe("Build direct-route deny — every guarded URL resolves to a permission, blocking users who lack it", () => {
  it.each(PROJECT_CASES)(
    "direct navigation to %s requires %s",
    (path, expectedKey) => {
      const decision = resolveRouteAccess(path);
      expect(decision.kind).toBe("permission");
      expect(resolvedKeys(path)).toContain(expectedKey);
    },
  );

  it.each(ORG_CASES)(
    "direct navigation to %s requires %s",
    (path, expectedKey) => {
      const decision = resolveRouteAccess(path);
      expect(decision.kind).toBe("permission");
      expect(resolvedKeys(path)).toContain(expectedKey);
    },
  );

  it("no guarded Build path resolves to unknown so enforceRouteAccess never bypasses the permission check", () => {
    const guardedPaths = PROJECT_CASES.map(([path]) => path).concat(
      ORG_CASES.map(([path]) => path),
    );
    const unknown = guardedPaths.filter(
      (p) => resolveRouteAccess(p).kind === "unknown",
    );
    expect(unknown).toEqual([]);
  });
});

describe("Build route-access permission posture is pinned for every manifested page", () => {
  const EXPECTED_ACCESS: ReadonlyArray<readonly [string, string]> = [
    ["/build", "module:build + build:view"],
    ["/build/[projectId]", "module:build + build:view"],
    ["/build/[projectId]/approvals", "module:build + build:approvals:view"],
    ["/build/[projectId]/backlog", "module:build + build:tickets:view"],
    ["/build/[projectId]/budget", "module:build + build:manage"],
    ["/build/[projectId]/change-requests", "module:build + build:changerequests:view"],
    ["/build/[projectId]/chat", "module:build + build:view"],
    ["/build/[projectId]/client-portal", "module:build + build:clientvisibility:manage"],
    ["/build/[projectId]/cycles", "module:build + build:cycles:view"],
    ["/build/[projectId]/cycles/[cycleId]", "module:build + build:cycles:view"],
    ["/build/[projectId]/decisions", "module:build + build:decisions:view"],
    ["/build/[projectId]/epics", "module:build + build:tickets:view"],
    ["/build/[projectId]/feedbucket", "module:build + feedbucket:widgets:view"],
    ["/build/[projectId]/feedbucket/[submissionId]", "module:build + feedbucket:widgets:view"],
    ["/build/[projectId]/files", "module:build + build:files:view"],
    ["/build/[projectId]/forms", "module:build + build:forms:view"],
    ["/build/[projectId]/forms/[formId]", "module:build + build:forms:view"],
    ["/build/[projectId]/incidents", "module:build + build:incidents:view"],
    ["/build/[projectId]/incidents/[incidentId]", "module:build + build:incidents:view"],
    ["/build/[projectId]/intake", "module:build + build:view"],
    ["/build/[projectId]/issues", "module:build + build:tickets:view"],
    ["/build/[projectId]/meetings", "module:build + build:meetings:view"],
    ["/build/[projectId]/meetings/[meetingId]", "module:build + build:meetings:view"],
    ["/build/[projectId]/milestones", "module:build + build:view"],
    ["/build/[projectId]/modules", "module:build + build:view"],
    ["/build/[projectId]/qa", "module:build + build:qa:view"],
    ["/build/[projectId]/qa/runs/[runId]", "module:build + build:qa:view"],
    ["/build/[projectId]/releases", "module:build + build:view"],
    ["/build/[projectId]/reports", "module:build + build:view"],
    ["/build/[projectId]/risks", "module:build + build:risks:view"],
    ["/build/[projectId]/settings", "module:build + build:update"],
    ["/build/[projectId]/settings/automations", "module:build + build:update"],
    ["/build/[projectId]/settings/integrations/webhooks", "module:build + build:update"],
    ["/build/[projectId]/settings/workflow", "module:build + build:update"],
    ["/build/[projectId]/tickets/[ticketKey]", "module:build + build:view"],
    ["/build/[projectId]/triage", "module:build + build:tickets:view"],
    ["/build/[projectId]/updates", "module:build + build:updates:view"],
    ["/build/[projectId]/whiteboard", "module:build + build:view"],
    ["/build/[projectId]/wiki", "module:build + build:view"],
    ["/build/[projectId]/wiki/[pageId]", "module:build + build:view"],
    ["/build/[projectId]/workload", "module:build + build:tickets:view"],
    ["/build/all-work", "module:build + build:tickets:view"],
    ["/build/approvals", "module:build + build:approvals:view"],
    ["/build/command-center", "module:build + build:view"],
    ["/build/goals", "module:build + build:goals:view"],
    ["/build/goals/[goalId]", "module:build + build:goals:view"],
    ["/build/inbox", "module:build + build:tickets:view"],
    ["/build/managed-products", "module:build + build:managed-products:view"],
    ["/build/managed-products/[managedProductId]", "module:build + build:managed-products:view"],
    ["/build/managed-products/[managedProductId]/feedback", "module:build + feedbucket:submissions:view"],
    ["/build/managed-products/[managedProductId]/goals", "module:build + build:goals:view"],
    ["/build/managed-products/[managedProductId]/insights", "module:build + build:managed-products:view"],
    ["/build/managed-products/[managedProductId]/projects", "module:build + build:view"],
    ["/build/managed-products/[managedProductId]/roadmap", "module:build + build:roadmap:view"],
    ["/build/my-work", "module:build + build:tickets:view"],
    ["/build/portfolios", "module:build + build:portfolios:view"],
    ["/build/portfolios/[portfolioId]", "module:build + build:portfolios:view"],
    ["/build/programs", "module:build + build:programs:view"],
    ["/build/roadmap", "module:build + build:roadmap:view"],
    ["/build/settings/access", "module:build + build:members:view,build:access:view"],
    ["/build/settings/client-access", "module:build + build:portal:view"],
    ["/build/settings/integrations", "module:build + integrations:git:view"],
    ["/build/teams", "module:build + build:teams:view"],
    ["/build/teams/[teamId]", "module:build + build:teams:view"],
    ["/build/templates", "module:build + build:create"],
  ];

  it("pins all 65 manifest routes so this table cannot drift out of step with the manifest", () => {
    expect(EXPECTED_ACCESS).toHaveLength(BUILD_ROUTE_MANIFEST.length);
    expect(EXPECTED_ACCESS.map(([route]) => route).sort()).toEqual(
      BUILD_ROUTE_MANIFEST.map((entry) => entry.route).sort(),
    );
  });

  it.each(EXPECTED_ACCESS)(
    "%s is gated by %s, so losing its catalog entry and silently falling back to the generic project key fails here",
    (route, expected) => {
      expect(
        describeRouteAccess(resolveRouteAccess(concreteUrlFor(route))),
      ).toBe(expected);
    },
  );

  it("an unregistered Build page still inherits the generic project key, which is why the pinned table is the drift detector and an unknown-check here would be vacuous", () => {
    expect(
      describeRouteAccess(
        resolveRouteAccess(concreteUrlFor("/build/[projectId]/not-a-real-page")),
      ),
    ).toBe("module:build + build:view");
  });
});
