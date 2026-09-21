import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";
import type { PermissionKey } from "@/lib/rbac/permissions";

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
  ["/build/42/timeline", "build:tickets:view"],
  ["/build/42/triage", "build:tickets:view"],
  ["/build/42/workload", "build:tickets:view"],
  ["/build/42/workflow", "build:workflow:view"],
  ["/build/42/webhooks", "build:manage"],
  ["/build/42/ai", "build:ai:use"],
  ["/build/42/settings", "build:update"],
  ["/build/42/budget", "build:manage"],
  ["/build/42/client-portal", "build:clientvisibility:manage"],
  ["/build/42/feedbucket", "feedbucket:widgets:view"],
  ["/build/42/qa", "build:qa:view"],
  ["/build/42/bugs", "build:bugs:view"],
  ["/build/42/incidents", "build:incidents:view"],
  ["/build/42/change-requests", "build:changerequests:view"],
  ["/build/42/approvals", "build:approvals:view"],
  ["/build/42/forms", "build:forms:view"],
  ["/build/42/risks", "build:risks:view"],
  ["/build/42/decisions", "build:decisions:view"],
  ["/build/42/meetings", "build:meetings:view"],
];

const WORKSPACE_AND_ORG_CASES: PermissionCase[] = [
  ["/build/workspaces/ws-1/all-work", "build:tickets:view"],
  ["/build/workspaces/ws-1/products", "build:managed-products:view"],
  ["/build/workspaces/ws-1/teams", "build:teams:view"],
  ["/build/customers", "build:customers:view"],
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

  it.each(WORKSPACE_AND_ORG_CASES)(
    "direct navigation to %s requires %s",
    (path, expectedKey) => {
      const decision = resolveRouteAccess(path);
      expect(decision.kind).toBe("permission");
      expect(resolvedKeys(path)).toContain(expectedKey);
    },
  );

  it("no guarded Build path resolves to unknown so enforceRouteAccess never bypasses the permission check", () => {
    const guardedPaths = PROJECT_CASES.map(([path]) => path).concat(
      WORKSPACE_AND_ORG_CASES.map(([path]) => path),
    );
    const unknown = guardedPaths.filter(
      (p) => resolveRouteAccess(p).kind === "unknown",
    );
    expect(unknown).toEqual([]);
  });
});
