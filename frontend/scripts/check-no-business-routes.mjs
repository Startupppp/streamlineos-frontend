import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const APP_DIR = join(ROOT, "app");
const PERMITTED = /[/\\]api[/\\]auth[/\\]/;

function isViolation(filePath) {
  return !PERMITTED.test(filePath);
}

function* findRoutes(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* findRoutes(full);
    } else if (entry.name === "route.ts" || entry.name === "route.tsx") {
      yield full;
    }
  }
}

const selfTest = process.argv.includes("--self-test");

if (selfTest) {
  let passed = 0;
  let failed = 0;

  const permittedPath = join(ROOT, "app", "api", "auth", "[...nextauth]", "route.ts");
  if (isViolation(permittedPath)) {
    process.stderr.write(`  FAIL  permitted auth route was incorrectly flagged: ${permittedPath}\n`);
    failed++;
  } else {
    process.stdout.write("  PASS  permitted auth route correctly not flagged\n");
    passed++;
  }

  const businessPath = join(ROOT, "app", "api", "users", "route.ts");
  if (!isViolation(businessPath)) {
    process.stderr.write(`  FAIL  business route was not flagged: ${businessPath}\n`);
    failed++;
  } else {
    process.stdout.write("  PASS  business route correctly flagged as violation\n");
    passed++;
  }

  const nestedBusinessPath = join(ROOT, "app", "api", "webhooks", "stripe", "route.ts");
  if (!isViolation(nestedBusinessPath)) {
    process.stderr.write(`  FAIL  nested business route was not flagged: ${nestedBusinessPath}\n`);
    failed++;
  } else {
    process.stdout.write("  PASS  nested business route correctly flagged as violation\n");
    passed++;
  }

  if (failed > 0) {
    process.stderr.write(`\n  SELF-TEST FAILED — ${failed} of ${passed + failed} assertions did not bite\n`);
    process.exit(1);
  }
  process.stdout.write(`\n  SELF-TEST PASSED — all ${passed} assertions bite correctly\n`);
  process.exit(0);
}

const violations = [];
let routeCount = 0;

for (const file of findRoutes(APP_DIR)) {
  routeCount++;
  if (isViolation(file)) violations.push(`  ${relative(ROOT, file)}`);
}

if (routeCount < 1) {
  process.stderr.write("✖  No route.ts files found in app/ — the walk is broken, so a clean result proves nothing.\n");
  process.exit(1);
}

if (violations.length === 0) {
  console.log(`✔  No business route handlers found. (${routeCount} route file(s) scanned)`);
  process.exit(0);
} else {
  console.error(`✖  ${violations.length} business route handler(s) — the only permitted route.ts is NextAuth (app/api/auth/):`);
  for (const v of violations) console.error(v);
  process.exit(1);
}
