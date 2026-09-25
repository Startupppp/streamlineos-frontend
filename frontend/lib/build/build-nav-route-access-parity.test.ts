import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";
import { buildScopeCatalog, splitDestinationHref } from "./build-nav-model";
import { BUILD_MY_WORK_DESTINATIONS } from "./nav/build-stable-destinations";
import { resolveBuildScope } from "./build-scope";
import type { BuildNavDestination } from "./nav/build-nav-destination";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { backendPermissionNames } from "@/test-utils/permission-catalog";

const SCOPE_PATHS = [
  "/build",
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

const KNOWN_KEY_DRIFT: readonly string[] = [];

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

  it("tolerates no allowlisted drift, so a disagreement must be fixed rather than suppressed", () => {
    expect(KNOWN_KEY_DRIFT).toEqual([]);
  });
});

describe("BSN-04-001 permission matrix — every primary destination across all four scopes", () => {
  it("every destination declares a required permission so useCan gates are never vacuous", () => {
    const withoutPermission = destinations
      .filter((destination) => {
        const req = destination.requiredPermission;
        return !req || (Array.isArray(req) && req.length === 0);
      })
      .map((destination) => destination.id);
    expect(withoutPermission).toEqual([]);
  });

  it("the backend catalog has enough keys that a missing import cannot pass vacuously", () => {
    expect(backendPermissionNames().size).toBeGreaterThan(200);
  });

  it("every nav permission key exists in the backend catalog so useCan is never permanently false", () => {
    const catalog = backendPermissionNames();
    const missing = destinations.flatMap((destination) =>
      keysOf(destination.requiredPermission).filter((key) => !catalog.has(key)),
    );
    expect(missing).toEqual([]);
  });
});

type CrossScopeCase = [
  crossScopePath: string,
  scopeLocalPermission: PermissionKey,
  basePermission: PermissionKey,
];

const CROSS_SCOPE_CASES: CrossScopeCase[] = [
  [
    "/build/managed-products/7/feedbucket",
    "feedbucket:widgets:view",
    "build:managed-products:view",
  ],
  [
    "/build/managed-products/7/cycles",
    "build:cycles:view",
    "build:managed-products:view",
  ],
  [
    "/build/managed-products/7/bugs",
    "build:bugs:view",
    "build:managed-products:view",
  ],
  [
    "/build/managed-products/7/qa",
    "build:qa:view",
    "build:managed-products:view",
  ],
  [
    "/build/managed-products/7/approvals",
    "build:approvals:view",
    "build:managed-products:view",
  ],
];

describe("BSN-01-026 cross-scope deep links — project extensions do not over-match product URLs", () => {
  it("covers representative cross-scope paths so a missing entry cannot pass vacuously", () => {
    expect(CROSS_SCOPE_CASES.length).toBeGreaterThan(3);
  });

  it.each(CROSS_SCOPE_CASES)(
    "%s resolves to the base scope key %s, not the project-local key %s",
    (crossScopePath, scopeLocalPermission, basePermission) => {
      const decision = resolveRouteAccess(crossScopePath);
      expect(decision.kind).toBe("permission");
      if (decision.kind !== "permission") return;
      const resolved = decision.permission
        ? keysOf(decision.permission)
        : [];
      expect(resolved).not.toContain(scopeLocalPermission);
      expect(resolved).toContain(basePermission);
    },
  );
});

const FEATURES_BUILD_DIR = resolve(process.cwd(), "features", "build");
const USE_CAN_KEY = /\buseCan\s*\(\s*["']([^"']+)["']\s*\)/g;
const PERMISSION_KEY_SHAPE = /^[a-z][a-z0-9_-]*(?::[a-z0-9_-]+)+$/;

function walkTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsxFiles(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function collectBuildUseCanKeys(): string[] {
  const out: string[] = [];
  for (const filePath of walkTsxFiles(FEATURES_BUILD_DIR)) {
    const source = readFileSync(filePath, "utf8");
    let match: RegExpExecArray | null;
    USE_CAN_KEY.lastIndex = 0;
    while ((match = USE_CAN_KEY.exec(source)) !== null) {
      const key = match[1];
      if (PERMISSION_KEY_SHAPE.test(key)) out.push(key);
    }
  }
  return out;
}

const BUILD_USE_CAN_KEYS = [...new Set(collectBuildUseCanKeys())].sort();

describe("BSN-04-001 — every useCan key in a Build component exists in the backend catalog", () => {
  it("finds a non-trivial number of distinct keys, so a broken filesystem walk cannot pass vacuously", () => {
    expect(BUILD_USE_CAN_KEYS.length).toBeGreaterThan(30);
  });

  it("names no key the backend catalog lacks, so no row action, create action, setting, badge or command is permanently disabled", () => {
    const catalog = backendPermissionNames();
    expect(BUILD_USE_CAN_KEYS.filter((key) => !catalog.has(key))).toEqual([]);
  });
});
