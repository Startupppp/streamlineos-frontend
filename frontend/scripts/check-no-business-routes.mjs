import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const APP_DIR = join(ROOT, "app");
const PERMITTED = /[/\\]api[/\\]auth[/\\]/;
const MIN_ROUTE_DIRS = 100;

function* findRoutes(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (isExcludedScanDir(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* findRoutes(full);
    } else if (entry.name === "route.ts" || entry.name === "route.tsx") {
      yield full;
    }
  }
}

function countDirs(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (isExcludedScanDir(entry.name)) continue;
    if (entry.isDirectory()) total += 1 + countDirs(join(dir, entry.name));
  }
  return total;
}

export function scan(appDir) {
  const violations = [];
  for (const file of findRoutes(appDir)) {
    if (!PERMITTED.test(file)) violations.push(`  ${relative(appDir, file)}`);
  }
  return violations;
}

function runSelfTest() {
  let passed = 0;
  const failures = [];
  const assert = (label, condition) => {
    if (condition) passed++;
    else failures.push(label);
  };

  const fixture = mkdtempSync(join(tmpdir(), "no-business-routes-"));
  try {
    mkdirSync(join(fixture, "api", "auth", "[...nextauth]"), { recursive: true });
    mkdirSync(join(fixture, "api", "contacts"), { recursive: true });
    mkdirSync(join(fixture, "(authenticated)", "crm", "deals"), { recursive: true });

    writeFileSync(join(fixture, "api", "auth", "[...nextauth]", "route.ts"), "export const GET = handler;\n");
    writeFileSync(join(fixture, "api", "contacts", "route.ts"), "export async function POST() {}\n");
    writeFileSync(join(fixture, "(authenticated)", "crm", "deals", "route.tsx"), "export async function GET() {}\n");
    writeFileSync(join(fixture, "(authenticated)", "crm", "deals", "page.tsx"), "export default function P() {}\n");

    const violations = scan(fixture);
    const joined = violations.join("\n");

    assert("a business route handler is rejected", joined.includes(join("api", "contacts", "route.ts")));
    assert("a .tsx route handler is rejected too", joined.includes("route.tsx"));
    assert("the NextAuth handler is permitted", !joined.includes("[...nextauth]"));
    assert("a page.tsx is not a route handler", !joined.includes("page.tsx"));
    assert("exactly the two known-bad handlers are reported", violations.length === 2);
    assert("the vacuity floor would fire on this fixture", countDirs(fixture) < MIN_ROUTE_DIRS);
    assert("the real app tree is above the vacuity floor", countDirs(APP_DIR) >= MIN_ROUTE_DIRS);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`\u2716  self-test FAILED: ${f}`);
    console.error(`check-no-business-routes self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-no-business-routes self-tests: ${passed} passed`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

const routeDirs = countDirs(APP_DIR);
if (routeDirs < MIN_ROUTE_DIRS) {
  console.error(
    `\u2716  Only ${routeDirs} route directories found under ${APP_DIR} (floor ${MIN_ROUTE_DIRS}) — the walk is broken, so a clean result would prove nothing.`,
  );
  process.exit(1);
}

const violations = scan(APP_DIR);

if (violations.length === 0) {
  console.log(`\u2714  No business route handlers found (${routeDirs} route directories walked).`);
  process.exit(0);
}
console.error(`\u2716  ${violations.length} business route handler(s) — the only permitted route.ts is NextAuth (app/api/auth/):`);
for (const v of violations) console.error(v);
process.exit(1);
