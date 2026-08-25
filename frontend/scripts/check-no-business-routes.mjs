import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const APP_DIR = join(ROOT, "app");
const PERMITTED = /[/\\]api[/\\]auth[/\\]/;

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

const violations = [];

for (const file of findRoutes(APP_DIR)) {
  if (!PERMITTED.test(file)) violations.push(`  ${relative(ROOT, file)}`);
}

if (violations.length === 0) {
  console.log("✔  No business route handlers found.");
  process.exit(0);
} else {
  console.error(`✖  ${violations.length} business route handler(s) — the only permitted route.ts is NextAuth (app/api/auth/):`);
  for (const v of violations) console.error(v);
  process.exit(1);
}
