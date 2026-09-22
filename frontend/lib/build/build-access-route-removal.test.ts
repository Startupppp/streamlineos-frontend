import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import {
  flattenNavRoutes,
  NAV_GROUPS,
} from "@/components/layout/sidebar/sidebar-nav-items";
import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";
import { buildOrganizationCatalog } from "./nav/build-organization-catalog";
import { BUILD_ROUTE_MANIFEST } from "./build-route-manifest";

const LEGACY_ROUTE = "/build/access";
const CANONICAL_ROUTE = "/build/settings/access";
const ROOT = process.cwd();

const SOURCE_DIRECTORIES = [
  "app",
  "components",
  "features",
  "hooks",
  "lib",
] as const;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

function walk(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(full);
  }
  return files;
}

function isSpec(file: string): boolean {
  const normalized = file.split("\\").join("/");
  return /\.test\.tsx?$/.test(normalized) || normalized.includes("/__tests__/");
}

function productionSources(): string[] {
  return SOURCE_DIRECTORIES.flatMap((dir) => walk(resolve(ROOT, dir))).filter(
    (file) => !isSpec(file),
  );
}

function sourceFilesMentioningLegacyRoute(): string[] {
  return productionSources()
    .filter((file) => readFileSync(file, "utf8").includes(LEGACY_ROUTE))
    .map((file) => relative(ROOT, file).split("\\").join("/"));
}

function nextConfigRedirects(): { source: string; destination: string }[] {
  const source = readFileSync(resolve(ROOT, "next.config.ts"), "utf8");
  return [
    ...source.matchAll(
      /source:\s*"([^"]+)",\s*(?:has:[\s\S]*?,\s*)?destination:\s*"([^"]+)"/g,
    ),
  ].map((match) => ({ source: match[1], destination: match[2] }));
}

function navHrefs(): string[] {
  const sidebar = NAV_GROUPS.flatMap((group) =>
    flattenNavRoutes(group.routes),
  ).map((route) => route.href);
  const catalog = buildOrganizationCatalog();
  const build = [
    ...catalog.moreTools.map((destination) => destination.href),
    ...(catalog.settings ? [catalog.settings.href] : []),
  ];
  return [...sidebar, ...build];
}

describe("BLD-02C — the obsolete /build/access route is gone and its job belongs to /build/settings/access", () => {
  it("has no page file at the legacy path, so the physical route no longer exists", () => {
    expect(
      existsSync(resolve(ROOT, "app", "(authenticated)", "build", "access")),
    ).toBe(false);
  });

  it("is absent from the build route manifest while the canonical route remains registered", () => {
    const routes = BUILD_ROUTE_MANIFEST.map((entry) => entry.route);
    expect(routes).not.toContain(LEGACY_ROUTE);
    expect(routes).toContain(CANONICAL_ROUTE);
  });

  it("keeps the legacy deep link working through a next.config redirect, which Next.js resolves before filesystem routing", () => {
    const redirect = nextConfigRedirects().find(
      (entry) => entry.source === LEGACY_ROUTE,
    );
    expect(redirect?.destination).toBe(CANONICAL_ROUTE);
  });

  it("never redirects the canonical route away again, so the legacy deep link cannot loop", () => {
    const sources = nextConfigRedirects().map((entry) => entry.source);
    expect(sources).not.toContain(CANONICAL_ROUTE);
  });

  it("is referenced by no navigation surface, so nothing links a user at the deleted route", () => {
    expect(navHrefs()).not.toContain(LEGACY_ROUTE);
  });

  it("points the Build access navigation entry at the canonical route", () => {
    const members = buildOrganizationCatalog().moreTools.find(
      (destination) => destination.id === "org-members",
    );
    expect(members?.href).toBe(CANONICAL_ROUTE);
  });

  it("survives in next.config alone, so no component, hook, schema or catalog still names the deleted route", () => {
    expect(sourceFilesMentioningLegacyRoute()).toEqual([]);
  });

  it("sweeps a real source tree, so the reference check cannot pass by resolving nothing", () => {
    const swept = productionSources();
    expect(swept.length).toBeGreaterThan(1000);
    expect(
      swept.filter((file) => readFileSync(file, "utf8").includes(CANONICAL_ROUTE))
        .length,
    ).toBeGreaterThan(0);
  });

  it("still gates the canonical route on the Build module access-view permission", () => {
    const decision = resolveRouteAccess(CANONICAL_ROUTE);
    expect(decision.kind).toBe("permission");
    const permission =
      decision.kind === "permission" ? decision.permission : null;
    const keys = Array.isArray(permission)
      ? permission
      : permission
        ? [permission]
        : [];
    expect(keys).toContain("build:access:view");
    expect(decision.kind === "permission" && decision.orgModuleKey).toBe("build");
  });
});
