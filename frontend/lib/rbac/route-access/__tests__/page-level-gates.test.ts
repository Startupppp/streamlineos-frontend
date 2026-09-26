import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { collectAppRoutes } from "../app-routes";
import { resolveRouteAccess } from "../route-access";
import { isUniversalRoute } from "../universal-routes";
import { backendPermissionNames } from "@/test-utils/permission-catalog";

const APP_DIR = resolve(process.cwd(), "app");
const AUTHENTICATED_DIR = join(APP_DIR, "(authenticated)");
const FRONTEND_CATALOG_DIR = resolve(process.cwd(), "lib", "rbac", "permissions");
const PERMISSION_KEY = /^[a-z][a-z0-9_-]*(?::[a-z0-9_-]+)+$/;

export interface SessionOnlySurface {
  readonly path: string;
  readonly subtree?: boolean;
  readonly childrenOnly?: boolean;
  readonly reason: string;
}

const SESSION_ONLY_BY_DESIGN: readonly SessionOnlySurface[] = [
  { path: "/access-denied", reason: "The denial destination itself. It must stay reachable by a user who was just denied, so gating it on a permission would bounce them into a redirect loop." },
  { path: "/dashboard", reason: "Home. Every active member keeps the cross-module read projection." },
  { path: "/inbox", reason: "Unified inbox. Each source is permission-filtered server-side." },
  { path: "/mail", reason: "Platform core communication surface." },
  { path: "/calendar", reason: "One unified calendar serves everyone; sources are toggles inside it." },
  { path: "/chat", reason: "Platform core communication surface." },
  { path: "/chat/channels", subtree: true, reason: "Channel membership is enforced per channel, not per route." },
  { path: "/chat/invite", subtree: true, reason: "Accepting a chat invite is a member self-service action." },
  { path: "/chat/settings", reason: "Alias that redirects to /chat and renders nothing. The destination carries its own gate." },
  { path: "/me", subtree: true, reason: "Employee self-service. The whole /me/* subtree derives its subject from the session." },
  { path: "/settings", reason: "The personal account landing page. Everything beneath it is organization administration." },
  { path: "/settings/notifications/my-preferences", subtree: true, reason: "A member's own notification preferences under Settings." },
  { path: "/knowledge/chat", subtree: true, reason: "Knowledge Base reading is platform core." },
  { path: "/knowledge/wiki", reason: "Knowledge Base reading is platform core; space and record ACLs still apply." },
  { path: "/knowledge/wiki/shared", subtree: true, reason: "Knowledge Base pages already shared with the member." },
  { path: "/knowledge/wiki/private", subtree: true, reason: "A member's own private Knowledge Base pages." },
  { path: "/knowledge/wiki/doc", subtree: true, reason: "Knowledge Base page reading is platform core; per-record ACLs gate the content." },
  { path: "/knowledge/wiki/spaces", childrenOnly: true, reason: "An individual Knowledge Base space is a reading surface; the space list itself stays gated on kb:spaces:view." },
  { path: "/hr/announcements", reason: "Company-wide announcement reading that happens to sit under the HR prefix." },
  { path: "/announcements", reason: "Alias that redirects to /hr/announcements and renders nothing. The destination carries its own gate." },
  { path: "/kb", reason: "Alias that redirects to /knowledge/wiki and renders nothing. The destination carries its own gate." },
  { path: "/docs", reason: "Alias that redirects to /knowledge/wiki and renders nothing. The destination carries its own gate." },
  { path: "/knowledge", reason: "Module root that redirects to /knowledge/chat and renders nothing. The destination carries its own gate." },
];

const GATED_MODULE_PREFIXES = ["/accounting", "/billing", "/blog", "/build", "/crm",
  "/inventory", "/parties", "/payroll", "/portal", "/sign", "/subjects", "/support",
  "/surveys", "/timesheets", "/workflows"];

type GateStrength = "permission" | "session" | "client-only" | "none";

interface PageGate {
  readonly path: string;
  readonly file: string;
  readonly strength: GateStrength;
  readonly keys: readonly string[];
  readonly via: readonly string[];
}

function balancedCall(source: string, openParen: number): string {
  let depth = 0;
  for (let i = openParen; i < source.length; i += 1) {
    if (source[i] === "(") depth += 1;
    else if (source[i] === ")" && (depth -= 1) === 0) return source.slice(openParen, i + 1);
  }
  return "";
}

function callArguments(source: string, fn: string): string[] {
  return [...source.matchAll(new RegExp(`\\b${fn}\\s*\\(`, "g"))].map((match) =>
    balancedCall(source, match.index + match[0].length - 1),
  );
}

function stringLiterals(args: string): string[] {
  return [...args.matchAll(/["'`]([^"'`]+)["'`]/g)].map((match) => match[1]);
}

export function serverGateFindings(
  source: string,
  routePath: string,
): { strength: GateStrength; keys: string[]; via: string[] } {
  const keys: string[] = [];
  const via: string[] = [];
  let strength: GateStrength = "none";
  const raise = (next: GateStrength, label: string) => {
    via.push(label);
    if (next === "permission") strength = "permission";
    else if (strength === "none") strength = next;
  };

  for (const args of callArguments(source, "requirePermission")) {
    keys.push(...stringLiterals(args).filter((value) => PERMISSION_KEY.test(value)));
    raise("permission", "requirePermission");
  }
  for (const args of callArguments(source, "requireModulePermission")) {
    keys.push(...stringLiterals(args).slice(1).filter((value) => PERMISSION_KEY.test(value)));
    raise("permission", "requireModulePermission");
  }
  if (callArguments(source, "enforceRouteAccess").length > 0) {
    const decision = resolveRouteAccess(routePath);
    if (decision.kind === "permission") {
      const required = decision.permission;
      keys.push(...(Array.isArray(required) ? required : required ? [required] : []));
      raise("permission", "enforceRouteAccess:permission");
    } else if (decision.kind === "universal") raise("session", "enforceRouteAccess:universal");
    else via.push("enforceRouteAccess:unknown");
  }
  if (callArguments(source, "requireSession").length > 0) raise("session", "requireSession");

  return { strength, keys, via };
}

const CLIENT_GATE = /<DashboardGate\b[^>]*\bpermission=|<RequireModule\b|\buseCan\s*\(/;

function layoutChain(relativeFile: string): string[] {
  const abs = join(APP_DIR, relativeFile);
  const files = [abs];
  let dir = dirname(abs);
  for (;;) {
    const layout = join(dir, "layout.tsx");
    if (existsSync(layout)) files.push(layout);
    if (dir === AUTHENTICATED_DIR || dir.length <= APP_DIR.length) break;
    dir = dirname(dir);
  }
  return files;
}

function auditPages(): PageGate[] {
  return collectAppRoutes("(authenticated)").map((route) => {
    const keys = new Set<string>();
    const via: string[] = [];
    let strength: GateStrength = "none";
    let clientGate = false;
    for (const file of layoutChain(route.file)) {
      const source = readFileSync(file, "utf8");
      if (file.endsWith("page.tsx") && CLIENT_GATE.test(source)) clientGate = true;
      const finding = serverGateFindings(source, route.path);
      finding.keys.forEach((key) => keys.add(key));
      via.push(...finding.via);
      if (finding.strength === "permission") strength = "permission";
      else if (finding.strength === "session" && strength === "none") strength = "session";
    }
    if (strength === "none" && clientGate) strength = "client-only";
    return { path: route.path, file: route.file, strength, keys: [...keys].sort(), via };
  });
}

function matchesSurface(routePath: string, surface: SessionOnlySurface): boolean {
  if (surface.childrenOnly === true) return routePath.startsWith(`${surface.path}/`);
  if (routePath === surface.path) return true;
  return surface.subtree === true && routePath.startsWith(`${surface.path}/`);
}

function sessionOnlyByDesign(routePath: string): boolean {
  return SESSION_ONLY_BY_DESIGN.some((surface) => matchesSurface(routePath, surface));
}

function frontendPermissionKeys(): Set<string> {
  const source = readdirSync(FRONTEND_CATALOG_DIR)
    .filter((name) => name === "types.ts" || name.startsWith("permission-key-"))
    .map((name) => readFileSync(join(FRONTEND_CATALOG_DIR, name), "utf8"))
    .join("\n");
  return new Set(
    [...source.matchAll(/\|\s*["']([^"']+)["']/g)]
      .map((match) => match[1])
      .filter((value) => PERMISSION_KEY.test(value)),
  );
}

function authenticatedModuleDirs(): string[] {
  return readdirSync(AUTHENTICATED_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !/^[(@_]/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

describe("page-level gates — every authenticated module", () => {
  const pages = auditPages();
  const gatedKeys = [...new Set(pages.flatMap((page) => page.keys))].sort();

  it("reaches both permission catalogs, so a silent empty sweep cannot pass", () => {
    expect(backendPermissionNames().size).toBeGreaterThan(400);
    expect(frontendPermissionKeys().size).toBeGreaterThan(400);
  });

  it("walks every authenticated module directory, not a hand-picked five", () => {
    const modules = authenticatedModuleDirs();
    expect(modules.length).toBeGreaterThan(20);
    const uncovered = modules.filter(
      (mod) => !pages.some((page) => page.path === `/${mod}` || page.path.startsWith(`/${mod}/`)),
    );
    expect(uncovered).toEqual([]);
    expect(pages.length).toBeGreaterThan(400);
  });

  it("distinguishes a permission gate from a session-only gate", () => {
    const strengthOf = (src: string, at = "/x") => serverGateFindings(src, at).strength;
    expect(strengthOf("await requireSession();")).toBe("session");
    expect(strengthOf('await requirePermission("build:tickets:view");')).toBe("permission");
    expect(strengthOf('await requireModulePermission("sign", "sign:envelope:view");')).toBe("permission");
    expect(strengthOf('import { requirePermission } from "@/lib/rbac/require-permission";')).toBe("none");
    expect(strengthOf('await enforceRouteAccess("/build");', "/build")).toBe("permission");
    expect(strengthOf('await enforceRouteAccess("/dashboard");', "/dashboard")).toBe("session");
    expect(serverGateFindings('await requirePermission("hr:leaves:view");', "/x").keys).toEqual(["hr:leaves:view"]);
    expect(serverGateFindings('await requireModulePermission("sign", "s:e:view");', "/x").keys).toEqual(["s:e:view"]);
  });

  it("leaves no authenticated page without a server-side gate of any kind", () => {
    const ungated = pages.filter((page) => page.strength === "none" || page.strength === "client-only")
      .map((page) => `${page.path}  (${page.file}) — ${page.strength}`)
      .sort();
    expect(ungated).toEqual([]);
  });

  it("gives every page outside the session-only allowlist a permission gate, not a bare session check", () => {
    const sessionOnly = pages
      .filter((page) => page.strength !== "permission")
      .filter((page) => !sessionOnlyByDesign(page.path))
      .map((page) => {
        const decision = resolveRouteAccess(page.path);
        const wanted =
          decision.kind === "permission"
            ? [decision.orgModuleKey ? `module:${decision.orgModuleKey}` : null,
               decision.permission ? String(decision.permission) : null].filter(Boolean).join(" + ")
            : decision.kind;
        return `${page.path}  gate=${page.strength}  registry-requires=${wanted}`;
      })
      .sort();
    expect(sessionOnly).toEqual([]);
  });

  it("keeps the session-only allowlist live — no entry that matches no page", () => {
    const stale = SESSION_ONLY_BY_DESIGN.filter(
      (surface) => !pages.some((page) => matchesSurface(page.path, surface)),
    ).map((surface) => surface.path);
    expect(stale).toEqual([]);
  });

  it("admits nothing into the allowlist that the runtime registry gates or that a gated module owns", () => {
    const contradicted = SESSION_ONLY_BY_DESIGN.flatMap((surface) =>
      pages
        .filter((page) => matchesSurface(page.path, surface))
        .filter((page) => !isUniversalRoute(page.path))
        .map((page) => `${surface.path} exempts ${page.path}, which the registry gates`),
    );
    const unreasoned = SESSION_ONLY_BY_DESIGN
      .filter((surface) => surface.reason.trim().length < 20)
      .map((surface) => `${surface.path}: no stated reason`);
    const moduleOwned = SESSION_ONLY_BY_DESIGN
      .filter((surface) => GATED_MODULE_PREFIXES.some((prefix) => surface.path === prefix || surface.path.startsWith(`${prefix}/`)))
      .map((surface) => `${surface.path}: sits inside a gated module`);
    expect([...contradicted, ...unreasoned, ...moduleOwned]).toEqual([]);
  });

  it("extracts a real key set from the gates, so the catalog checks below cannot pass on an empty sweep", () => {
    expect(gatedKeys.length).toBeGreaterThan(150);
    const blindCalls = pages
      .filter((page) => page.via.includes("requirePermission") && page.keys.length === 0)
      .map((page) => page.path);
    expect(blindCalls).toEqual([]);
  });

  it("asserts only permission keys that exist verbatim in the backend catalog", () => {
    const names = backendPermissionNames();
    expect(gatedKeys.filter((key) => !names.has(key))).toEqual([]);
  });

  it("asserts only permission keys that exist verbatim in the frontend catalog", () => {
    const keys = frontendPermissionKeys();
    expect(gatedKeys.filter((key) => !keys.has(key))).toEqual([]);
  });
});
