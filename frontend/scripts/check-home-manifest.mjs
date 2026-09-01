/**
 * check-home-manifest.mjs
 *
 * Validates that frontend/lib/home/home-manifest.generated.json is not stale
 * relative to the backend dashboard controller. Parses the backend controller
 * file and compares the route access metadata against the checked-in artifact.
 *
 * Fails if:
 *   - The backend controller has a route not in the manifest
 *   - The manifest has an endpoint not in the backend controller
 *   - A route's permission or module disagrees between controller and manifest
 *   - The manifest version cannot be read
 *
 * Self-test mode (--self-test): exercises the parse and diff logic against
 * known-broken fixtures and exits 0 only when all checks bite correctly.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const MANIFEST_PATH = join(FRONTEND_ROOT, "lib", "home", "home-manifest.generated.json");
const CONTROLLER_PATH = join(
  FRONTEND_ROOT,
  "..",
  "backend",
  "src",
  "modules",
  "dashboard",
  "dashboard.controller.ts",
);

/**
 * Parse GET routes from the dashboard controller.
 * Returns a map of endpoint → { universal, module, permission }.
 */
function parseControllerRoutes(source) {
  const routes = new Map();
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const getMatch = /@Get\(\s*["']([^"']+)["']\s*\)/.exec(lines[i]);
    if (!getMatch) continue;

    const endpoint = `/dashboard/${getMatch[1]}`;
    let permission = null;
    let module = null;
    let universal = false;

    for (let ahead = i + 1; ahead < lines.length; ahead++) {
      const line = lines[ahead];
      if (!/^\s*@/.test(line)) break;
      const permMatch = /@RequirePermission\(\s*["']([^"']+)["']/.exec(line);
      if (permMatch) permission = permMatch[1];
      const modMatch = /@RequireModule\(\s*["']([^"']+)["']/.exec(line);
      if (modMatch) module = modMatch[1];
      if (/@Universal\(\)/.test(line)) universal = true;
    }

    routes.set(endpoint, { universal, module, permission });
  }

  return routes;
}

function diffRoutes(manifest, controllerRoutes) {
  const violations = [];
  const manifestByEndpoint = new Map(manifest.sections.map((s) => [s.endpoint, s]));

  for (const [endpoint, ctrl] of controllerRoutes) {
    const entry = manifestByEndpoint.get(endpoint);
    if (!entry) {
      violations.push(`[stale] Controller route "${endpoint}" is missing from home-manifest.generated.json`);
      continue;
    }
    if (ctrl.universal !== entry.universal)
      violations.push(`[drift] ${endpoint}: universal — controller=${ctrl.universal}, manifest=${entry.universal}`);
    if (ctrl.module !== entry.module)
      violations.push(`[drift] ${endpoint}: module — controller=${String(ctrl.module)}, manifest=${String(entry.module)}`);
    if (ctrl.permission !== entry.permission)
      violations.push(`[drift] ${endpoint}: permission — controller=${String(ctrl.permission)}, manifest=${String(entry.permission)}`);
  }

  for (const [endpoint] of manifestByEndpoint) {
    if (!controllerRoutes.has(endpoint))
      violations.push(`[stale] Manifest endpoint "${endpoint}" has no matching controller route`);
  }

  return violations;
}

function runSelfTest() {
  console.log("Running self-test for check-home-manifest...\n");
  let passed = 0;
  let failed = 0;

  function assert(label, condition) {
    if (condition) {
      console.log(`  PASS  ${label}`);
      passed++;
    } else {
      console.error(`  FAIL  ${label}`);
      failed++;
    }
  }

  const baseManifest = {
    version: 1,
    sections: [
      { endpoint: "/dashboard/stats", universal: true, module: null, permission: null },
      { endpoint: "/dashboard/personal", universal: true, module: null, permission: null },
    ],
  };

  {
    const ctrl = parseControllerRoutes(`
      @Get("stats")
      @Universal()
      stats() {}
      @Get("personal")
      @Universal()
      personal() {}
    `);
    const v = diffRoutes(baseManifest, ctrl);
    assert("clean manifest+controller produces no violations", v.length === 0);
  }

  {
    const ctrl = parseControllerRoutes(`
      @Get("stats")
      @Universal()
      stats() {}
      @Get("personal")
      @Universal()
      personal() {}
      @Get("new-route")
      @Universal()
      newRoute() {}
    `);
    const v = diffRoutes(baseManifest, ctrl);
    assert("controller has extra route → violation reported", v.some((s) => s.includes("new-route")));
  }

  {
    const ctrl = parseControllerRoutes(`
      @Get("stats")
      @Universal()
      stats() {}
    `);
    const v = diffRoutes(baseManifest, ctrl);
    assert("manifest has extra endpoint → violation reported", v.some((s) => s.includes("personal")));
  }

  {
    const ctrl = parseControllerRoutes(`
      @Get("stats")
      @UseGuards(PermissionGuard)
      @RequirePermission("hr:employees:view")
      stats() {}
      @Get("personal")
      @Universal()
      personal() {}
    `);
    const v = diffRoutes(baseManifest, ctrl);
    assert("permission drift is detected", v.some((s) => s.includes("permission") && s.includes("stats")));
  }

  {
    const ctrl = parseControllerRoutes(`
      @Get("stats")
      @UseGuards(ModuleGuard)
      @RequireModule("hr")
      @Universal()
      stats() {}
      @Get("personal")
      @Universal()
      personal() {}
    `);
    const v = diffRoutes(baseManifest, ctrl);
    assert("module drift is detected", v.some((s) => s.includes("module") && s.includes("stats")));
  }

  {
    const source = `
      @Get("stats")
      @Universal()
      stats() {}
      @Get("personal")
      @Universal()
      personal() {}
    `;
    const ctrl = parseControllerRoutes(source);
    assert("parser reads correct number of routes", ctrl.size === 2);
    assert("parser flags @Universal() correctly", ctrl.get("/dashboard/stats")?.universal === true);
    assert("parser reads permission when present", (() => {
      const src2 = `
        @Get("team-attendance")
        @UseGuards(ModuleGuard, PermissionGuard)
        @RequireModule("hr")
        @RequirePermission("hr:attendance:view")
        teamAttendance() {}
      `;
      const c2 = parseControllerRoutes(src2);
      return c2.get("/dashboard/team-attendance")?.permission === "hr:attendance:view";
    })());
  }

  console.log(`\nSelf-test complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

if (!existsSync(MANIFEST_PATH)) {
  console.error(`✖  Missing: ${MANIFEST_PATH}`);
  console.error("   Run the generator: node backend/src/scripts/generate-home-manifest.mjs");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
if (typeof manifest.version !== "number") {
  console.error("✖  home-manifest.generated.json has no version field.");
  process.exit(1);
}

if (!existsSync(CONTROLLER_PATH)) {
  console.warn("  [NOTICE] backend/ is absent — controller comparison is SKIPPED.");
  console.log("✔  Manifest file is present (controller comparison skipped in this workspace).");
  process.exit(0);
}

const controllerSource = readFileSync(CONTROLLER_PATH, "utf8");
const controllerRoutes = parseControllerRoutes(controllerSource);

if (controllerRoutes.size < 5) {
  console.error(`✖  Only ${controllerRoutes.size} routes parsed from controller (floor: 5). Parse failed.`);
  process.exit(1);
}

const violations = diffRoutes(manifest, controllerRoutes);

console.log(`Dashboard controller routes parsed   ${controllerRoutes.size}`);
console.log(`Manifest sections                    ${manifest.sections.length}`);
console.log("");

if (violations.length === 0) {
  console.log("✔  home-manifest.generated.json is consistent with the backend controller.");
  process.exit(0);
}

console.error(`✖  ${violations.length} home manifest violation(s) found:`);
for (const v of violations) console.error(`   ${v}`);
console.error("");
console.error("   Regenerate: node frontend/scripts/generate-home-manifest.mjs");
process.exit(1);
