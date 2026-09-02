import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  HOME_SECTIONS,
  homeSection,
  homeSectionModule,
  homeSectionPermission,
} from "../home-sections";
import { backendPath } from "@/test-utils/backend-repo";

const FRONTEND_ROOT = resolve(__dirname, "../../..");
const DASHBOARD_HOOKS = join(FRONTEND_ROOT, "hooks", "api", "dashboard.ts");
const DASHBOARD_ACCESS = join(
  FRONTEND_ROOT,
  "features",
  "dashboard",
  "use-dashboard-access.ts",
);
const PERMISSIONS_DIR = join(FRONTEND_ROOT, "lib", "rbac", "permissions");
const BACKEND_DASHBOARD_CONTROLLER = backendPath("src", "modules", "dashboard", "dashboard.controller.ts");

function frontendCatalogKeys(): Set<string> {
  const keys = new Set<string>();
  for (const fileName of readdirSync(PERMISSIONS_DIR)) {
    if (!fileName.endsWith(".ts")) continue;
    const source = readFileSync(join(PERMISSIONS_DIR, fileName), "utf8");
    for (const match of source.matchAll(/name:\s*["']([^"']+)["']/g))
      keys.add(match[1]);
  }
  return keys;
}

interface BackendRoute {
  path: string;
  permission: string | null;
  universal: boolean;
}

function backendDashboardRoutes(): Map<string, BackendRoute> {
  const source = readFileSync(BACKEND_DASHBOARD_CONTROLLER, "utf8");
  const routes = new Map<string, BackendRoute>();
  const lines = source.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const getMatch = /@Get\(\s*["']([^"']+)["']\s*\)/.exec(lines[index]);
    if (!getMatch) continue;
    let permission: string | null = null;
    let universal = false;
    for (let ahead = index + 1; ahead < lines.length; ahead += 1) {
      const line = lines[ahead];
      if (!/^\s*@/.test(line)) break;
      const permMatch = /@RequirePermission\(\s*["']([^"']+)["']/.exec(line);
      if (permMatch) permission = permMatch[1];
      if (/@Universal\(\)/.test(line)) universal = true;
    }
    routes.set(`/dashboard/${getMatch[1]}`, {
      path: `/dashboard/${getMatch[1]}`,
      permission,
      universal,
    });
  }
  return routes;
}

describe("Home section access metadata", () => {
  const catalog = frontendCatalogKeys();

  it("declares a section for a real surface, so an empty registry cannot pass", () => {
    expect(HOME_SECTIONS.length).toBeGreaterThanOrEqual(15);
    expect(catalog.size).toBeGreaterThan(400);
  });

  it("gives every section a unique id and a non-empty label and endpoint", () => {
    const ids = HOME_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of HOME_SECTIONS) {
      expect(section.label.length).toBeGreaterThan(2);
      expect(section.endpoint.startsWith("/")).toBe(true);
    }
  });

  it("uses only permission keys that exist in the catalog", () => {
    const ghosts = HOME_SECTIONS.map((section) => homeSectionPermission(section.id))
      .filter((key): key is string => key !== null)
      .filter((key) => !catalog.has(key));
    expect(ghosts).toEqual([]);
  });

  it("throws rather than guessing for an unknown section id", () => {
    expect(() => homeSection("not-a-section")).toThrow(/Unknown Home section/);
  });

  it("reports module and permission independently", () => {
    expect(homeSectionModule("stats")).toBeNull();
    expect(homeSectionPermission("stats")).toBeNull();
    expect(homeSectionModule("my-issues")).toBe("build");
    expect(homeSectionPermission("my-issues")).toBeNull();
    expect(homeSectionPermission("team-attendance")).toBe("hr:attendance:view");
    expect(homeSectionModule("public-documents")).toBe("hr");
    expect(homeSectionPermission("public-documents")).toBe("hr:documents:view");
  });
});

describe("Home section metadata matches the backend dashboard controller", () => {
  const backendRoutes = backendDashboardRoutes();

  it("can read the backend controller, so a silent empty sweep cannot pass", () => {
    expect(backendRoutes.size).toBeGreaterThan(10);
  });

  it("parses decorators onto the route they belong to", () => {
    expect(backendRoutes.get("/dashboard/stats")?.universal).toBe(true);
    expect(backendRoutes.get("/dashboard/stats")?.permission).toBeNull();
    expect(backendRoutes.get("/dashboard/team-attendance")?.permission).toBe(
      "hr:attendance:view",
    );
    expect(backendRoutes.get("/dashboard/executive")?.permission).toBe(
      "hr:analytics:read",
    );
  });

  it("actually compares a majority of the declared sections", () => {
    const compared = HOME_SECTIONS.filter((section) =>
      backendRoutes.has(section.endpoint),
    );
    expect(compared.length).toBeGreaterThanOrEqual(12);
  });

  it("declares the same permission the backend route enforces", () => {
    const mismatches: string[] = [];
    for (const section of HOME_SECTIONS) {
      const route = backendRoutes.get(section.endpoint);
      if (!route) continue;
      const declared = homeSectionPermission(section.id);
      if (route.universal && route.permission === null) {
        if (declared !== null)
          mismatches.push(
            `${section.id}: backend is universal but registry requires ${declared}`,
          );
        continue;
      }
      if (route.permission !== declared)
        mismatches.push(
          `${section.id}: backend ${route.permission ?? "none"} vs registry ${declared ?? "none"}`,
        );
    }
    expect(mismatches).toEqual([]);
  });
});

describe("every Home query is gated before it fires", () => {
  const source = readFileSync(DASHBOARD_HOOKS, "utf8");

  it("reads the dashboard hooks file", () => {
    expect(source).toContain("export const useTeamAttendance");
  });

  it("gates the company-documents widget on its backend permission", () => {
    const hook = source.slice(source.indexOf("export const usePublicDocuments"));
    expect(hook).toContain('useCan("hr:documents:view")');
    expect(hook).toContain("canView");
  });

  it("leaves no dashboard query enabled by organization membership alone", () => {
    const universalEndpoints = new Set(
      HOME_SECTIONS.filter((section) => section.access.kind === "universal").map(
        (section) => section.endpoint,
      ),
    );
    const ungated: string[] = [];
    let evaluated = 0;
    const blocks = source.split("export const use").slice(1);
    for (const block of blocks) {
      const endpoint = /apiClient\.get<[^>]*>\(\s*["']([^"']+)["']/.exec(block);
      if (!endpoint) continue;
      if (universalEndpoints.has(endpoint[1])) continue;
      const enabledLine = /^\s{4}enabled:\s*([^\n]+)/m.exec(block);
      if (!enabledLine) {
        ungated.push(`${endpoint[1]}: no enabled gate at all`);
        continue;
      }
      evaluated += 1;
      const gate = enabledLine[1];
      const gated =
        gate.includes("canView") ||
        gate.includes("canApprove") ||
        gate.includes("hrEnabled") ||
        gate.includes("buildEnabled") ||
        gate.includes("Enabled");
      if (!gated) ungated.push(`${endpoint[1]}: enabled: ${gate.trim()}`);
    }
    expect(ungated).toEqual([]);
    expect(evaluated).toBeGreaterThanOrEqual(8);
  });
});

describe("Home consumes the generated contract instead of a parallel registry", () => {
  const sectionPermissions = new Set(
    HOME_SECTIONS.map((section) => homeSectionPermission(section.id)).filter(
      (key): key is string => key !== null,
    ),
  );

  it("has section permissions to compare, so an empty set cannot pass", () => {
    expect(sectionPermissions.size).toBeGreaterThanOrEqual(6);
  });

  it("keeps no hand-written copy of a section permission in the Home access hook", () => {
    const source = readFileSync(DASHBOARD_ACCESS, "utf8");
    expect(source).toContain("homeSectionPermission");
    const literals = [...source.matchAll(/can\(\s*"([^"]+)"\s*\)/g)].map(
      (match) => match[1],
    );
    expect(literals.length).toBeGreaterThanOrEqual(8);
    expect(literals.filter((key) => sectionPermissions.has(key))).toEqual([]);
  });

  it("gates every Home query on a permission the backend manifest declares", () => {
    const source = readFileSync(DASHBOARD_HOOKS, "utf8");
    const gateKeys = [...source.matchAll(/useCan\(\s*"([^"]+)"\s*\)/g)].map(
      (match) => match[1],
    );
    expect(gateKeys.length).toBeGreaterThanOrEqual(6);
    expect(gateKeys.filter((key) => !sectionPermissions.has(key))).toEqual([]);
  });
});
