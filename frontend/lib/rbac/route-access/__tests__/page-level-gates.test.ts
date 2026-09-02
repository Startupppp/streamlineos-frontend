import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Modules where each server-component page must carry an explicit permission gate
 * (enforceRouteAccess | requirePermission | requireModulePermission). These modules
 * gate access at the page level rather than relying solely on a shared layout.
 */
const PAGE_GATED_MODULES = [
  "build",
  "settings",
  "billing",
  "support",
  "timesheets",
  "sign",
  "surveys",
] as const;

/**
 * Modules where a single layout.tsx carries enforceRouteAccess for the whole subtree.
 * Each must have a gated layout; individual pages need not repeat the gate.
 */
const LAYOUT_GATED_MODULES = [
  "accounting",
  "crm",
  "hr",
  "inventory",
  "payroll",
  "workflows",
] as const;

const ALL_GATED_MODULES = [...PAGE_GATED_MODULES, ...LAYOUT_GATED_MODULES] as const;

/**
 * Server-component pages inside PAGE_GATED_MODULES that are universal by design
 * and legitimately use only requireSession rather than a permission gate.
 * Every entry must name the reason; adding one requires confirming the route is
 * in UNIVERSAL_ROUTES or universalDescendants in universal-routes.ts.
 */
const SESSION_ONLY_SERVER_PAGES: ReadonlyMap<string, string> = new Map([
  [
    "build/inbox/page.tsx",
    "Unified inbox merges notifications the member is already entitled to — universal surface.",
  ],
  [
    "build/[projectId]/wiki/page.tsx",
    "Project wiki reading is platform-core KB access — gated at the component level via RequireModule.",
  ],
  [
    "build/[projectId]/wiki/[pageId]/page.tsx",
    "Individual wiki page reading is platform-core KB access.",
  ],
]);

/**
 * A permission gate is enforceRouteAccess, requirePermission, or
 * requireModulePermission. requireSession alone is a session gate, not a
 * permission gate — a page that passes requireSession is reachable by every
 * authenticated user and must be in SESSION_ONLY_SERVER_PAGES if that is
 * intentional within a PAGE_GATED_MODULE.
 */
const PERMISSION_GATE_PATTERN =
  /enforceRouteAccess|requirePermission|requireModulePermission/;

function* walkPageFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkPageFiles(full);
    } else if (entry.name === "page.tsx" || entry.name === "page.jsx") {
      yield full;
    }
  }
}

function isClientComponent(filePath: string): boolean {
  const content = readFileSync(filePath, "utf8").replace(/^﻿/, "");
  return /^["']use client["']/m.test(content);
}

function hasPermissionGate(filePath: string): boolean {
  const content = readFileSync(filePath, "utf8");
  return PERMISSION_GATE_PATTERN.test(content);
}

function hasLayoutGate(moduleDir: string): boolean {
  const layoutPath = join(moduleDir, "layout.tsx");
  try {
    statSync(layoutPath);
    const content = readFileSync(layoutPath, "utf8");
    return PERMISSION_GATE_PATTERN.test(content);
  } catch {
    return false;
  }
}

function collectPageGatedModulePages() {
  const appDir = resolve(process.cwd(), "app", "(authenticated)");
  const server: string[] = [];
  const client: Record<string, string[]> = {};

  for (const mod of PAGE_GATED_MODULES) {
    const modDir = join(appDir, mod);
    client[mod] = [];
    try {
      statSync(modDir);
    } catch {
      continue;
    }
    for (const file of walkPageFiles(modDir)) {
      if (isClientComponent(file)) {
        client[mod].push(file);
      } else {
        server.push(file);
      }
    }
  }

  return { server, client };
}

function relPath(filePath: string): string {
  const appDir = resolve(process.cwd(), "app", "(authenticated)") + "/";
  return filePath.replace(/\\/g, "/").replace(appDir.replace(/\\/g, "/"), "");
}

describe("page-level gates — page-gated modules", () => {
  const { server, client } = collectPageGatedModulePages();

  const totalPages =
    server.length + Object.values(client).reduce((s, arr) => s + arr.length, 0);

  it("finds more than 100 pages across the page-gated modules so a broken walk cannot pass silently", () => {
    expect(totalPages).toBeGreaterThan(100);
  });

  it("every server-component page in page-gated modules carries a permission gate or is in the session-only allowlist", () => {
    const ungated = server
      .filter((file) => {
        if (hasPermissionGate(file)) return false;
        const rel = relPath(file);
        if (SESSION_ONLY_SERVER_PAGES.has(rel)) return false;
        return true;
      })
      .map(relPath);
    expect(ungated).toEqual([]);
  });

  it("every session-only allowlist entry exists on disk and matches a real page file", () => {
    const appDir = resolve(process.cwd(), "app", "(authenticated)");
    const missing = [...SESSION_ONLY_SERVER_PAGES.keys()].filter((rel) => {
      const full = join(appDir, rel);
      try {
        statSync(full);
        return false;
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });

  it("documents client-component pages per module — each stays within its cap", () => {
    const CLIENT_PAGE_CAPS: Record<string, number> = {
      build: 50,
      settings: 10,
      billing: 5,
      support: 10,
      timesheets: 5,
      sign: 5,
      surveys: 10,
    };

    const totalClient = Object.values(client).reduce((s, arr) => s + arr.length, 0);
    expect(totalClient).toBeLessThanOrEqual(100);
    expect(totalClient).toBeGreaterThan(0);

    for (const [mod, cap] of Object.entries(CLIENT_PAGE_CAPS)) {
      expect(client[mod]?.length ?? 0).toBeLessThanOrEqual(cap);
    }
  });
});

describe("page-level gates — layout-gated modules", () => {
  const appDir = resolve(process.cwd(), "app", "(authenticated)");

  it("finds all layout-gated module directories so a typo cannot pass silently", () => {
    for (const mod of LAYOUT_GATED_MODULES) {
      const modDir = join(appDir, mod);
      expect(() => statSync(modDir)).not.toThrow();
    }
  });

  it("every layout-gated module has a root layout.tsx carrying a permission gate", () => {
    const missing = LAYOUT_GATED_MODULES.filter((mod) => !hasLayoutGate(join(appDir, mod)));
    expect(missing).toEqual([]);
  });
});

describe("page-level gates — gated-module coverage proof", () => {
  it("page-gated and layout-gated together cover more modules than the original 5", () => {
    expect(ALL_GATED_MODULES.length).toBeGreaterThan(5);
  });

  it("no gated module appears in both page-gated and layout-gated lists", () => {
    const pageSet = new Set<string>(PAGE_GATED_MODULES);
    const overlap = LAYOUT_GATED_MODULES.filter((m) => pageSet.has(m));
    expect(overlap).toEqual([]);
  });
});
