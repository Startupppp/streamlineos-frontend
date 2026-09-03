import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isExcludedScanDir } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const APP_DIR = join(ROOT, "app");
const MIN_ROUTE_DIRS = 100;

/**
 * Root CLAUDE.md §5 permits exactly two kinds of frontend `route.ts`: NextAuth,
 * and an **auth bridge** — a handler that exists only because the browser cannot
 * put the session's `backendJwt` on a request it makes itself. Until 2026-09-03
 * this gate encoded only the first half of that rule as `/api/auth/`, which was
 * simultaneously too narrow (it failed the media bridge, which the constitution
 * allows) and too wide (ANY file under `app/api/auth/**` passed unread, so
 * `app/api/auth/contacts/route.ts` would have been waved through).
 *
 * The allowlist below is by exact path, never by pattern, and an entry is not a
 * pass on its own: each allowlisted handler is re-checked on every run against
 * the properties that make it a bridge rather than an API. An entry whose file
 * has been deleted fails, and so does one whose file has grown a write.
 */
const ALLOWED_ROUTES = new Map([
  [
    `api${sep}auth${sep}[...nextauth]${sep}route.ts`,
    {
      reason: "NextAuth handler — the session itself.",
      properties: [],
    },
  ],
  [
    `api${sep}media${sep}image${sep}route.ts`,
    {
      reason:
        "Auth bridge. An <img> cannot send an Authorization header, so a storage key is rendered through the app's own origin; the handler attaches the session's backendJwt, forwards to GET /storage/image, and hardens the content type. It holds no business rule and touches no database. ~110 render sites depend on it (lib/utils.ts:storageObjectUrl).",
      properties: ["session", "read-only"],
    },
  ],
]);

const SESSION_RE = /\bgetServerAuth\b|\bgetServerSession\b|\bauth\(\)/;
const WRITE_HANDLER_RE = /export\s+(?:async\s+)?(?:function|const)\s+(POST|PUT|PATCH|DELETE)\b/;

/**
 * The properties an allowlisted bridge must still hold. `session` proves the
 * handler exists to carry an identity the browser could not attach itself; a
 * handler that reads no session is a public endpoint, not a bridge.
 * `read-only` is what keeps the entry from quietly becoming an API: a write
 * through the frontend is business logic by definition (§5).
 */
function propertyFailures(source, properties) {
  const failures = [];
  for (const property of properties) {
    if (property === "session" && !SESSION_RE.test(source))
      failures.push("reads no session, so it is not an auth bridge");
    if (property === "read-only") {
      const write = WRITE_HANDLER_RE.exec(source);
      if (write) failures.push(`exports ${write[1]} — a write through the frontend is business logic`);
    }
  }
  return failures;
}

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

export function scan(appDir, allowed = ALLOWED_ROUTES) {
  const violations = [];
  const seen = new Set();

  for (const file of findRoutes(appDir)) {
    const rel = relative(appDir, file);
    const entry = allowed.get(rel);
    if (entry === undefined) {
      violations.push(`  ${rel}`);
      continue;
    }
    seen.add(rel);
    for (const failure of propertyFailures(readFileSync(file, "utf8"), entry.properties))
      violations.push(`  ${rel}  (allowlisted as an auth bridge, but it ${failure})`);
  }

  for (const rel of allowed.keys()) {
    if (!seen.has(rel)) violations.push(`  ${rel}  (stale allowlist entry — no such route handler on disk)`);
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
    mkdirSync(join(fixture, "api", "auth", "contacts"), { recursive: true });
    mkdirSync(join(fixture, "api", "contacts"), { recursive: true });
    mkdirSync(join(fixture, "api", "bridge"), { recursive: true });
    mkdirSync(join(fixture, "(authenticated)", "crm", "deals"), { recursive: true });

    const nextAuthRel = join("api", "auth", "[...nextauth]", "route.ts");
    const bridgeRel = join("api", "bridge", "route.ts");

    writeFileSync(join(fixture, nextAuthRel), "export const GET = handler;\n");
    writeFileSync(join(fixture, "api", "auth", "contacts", "route.ts"), "export async function POST() {}\n");
    writeFileSync(join(fixture, "api", "contacts", "route.ts"), "export async function POST() {}\n");
    writeFileSync(
      join(fixture, bridgeRel),
      'const s = await getServerAuth();\nexport async function GET() {}\n',
    );
    writeFileSync(join(fixture, "(authenticated)", "crm", "deals", "route.tsx"), "export async function GET() {}\n");
    writeFileSync(join(fixture, "(authenticated)", "crm", "deals", "page.tsx"), "export default function P() {}\n");

    const allowed = new Map([
      [nextAuthRel, { reason: "NextAuth", properties: [] }],
      [bridgeRel, { reason: "bridge", properties: ["session", "read-only"] }],
    ]);

    const violations = scan(fixture, allowed);
    const joined = violations.join("\n");

    assert("a business route handler is rejected", joined.includes(join("api", "contacts", "route.ts")));
    assert("a .tsx route handler is rejected too", joined.includes("route.tsx"));
    assert("the NextAuth handler is permitted", !joined.includes("[...nextauth]"));
    assert(
      "a route smuggled under api/auth/ is NOT permitted — the old prefix regex passed it unread",
      joined.includes(join("api", "auth", "contacts", "route.ts")),
    );
    assert("an allowlisted read-only bridge that reads the session is permitted", !joined.includes(bridgeRel));
    assert("a page.tsx is not a route handler", !joined.includes("page.tsx"));
    assert("exactly the three known-bad handlers are reported", violations.length === 3);
    assert("the vacuity floor would fire on this fixture", countDirs(fixture) < MIN_ROUTE_DIRS);
    assert("the real app tree is above the vacuity floor", countDirs(APP_DIR) >= MIN_ROUTE_DIRS);

    writeFileSync(join(fixture, bridgeRel), "export async function GET() {}\n");
    const noSession = scan(fixture, allowed).join("\n");
    assert(
      "an allowlisted bridge that reads no session is rejected",
      noSession.includes("reads no session"),
    );

    writeFileSync(
      join(fixture, bridgeRel),
      'const s = await getServerAuth();\nexport async function GET() {}\nexport async function POST() {}\n',
    );
    const withWrite = scan(fixture, allowed).join("\n");
    assert("an allowlisted bridge that grows a write is rejected", withWrite.includes("exports POST"));

    rmSync(join(fixture, bridgeRel));
    const stale = scan(fixture, allowed).join("\n");
    assert("an allowlist entry whose file is gone is rejected", stale.includes("stale allowlist entry"));

    assert(
      "every real allowlist entry carries a non-empty reason",
      [...ALLOWED_ROUTES.values()].every((e) => typeof e.reason === "string" && e.reason.length > 20),
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`✖  self-test FAILED: ${f}`);
    console.error(`check-no-business-routes self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-no-business-routes self-tests: ${passed} passed`);
  process.exit(0);
}

/**
 * `scan` is exported so the gate can be bite-proved against a COPY of the real
 * app tree. Importing it must therefore not walk anything or exit.
 */
const RUN_AS_SCRIPT = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (!RUN_AS_SCRIPT) {
  // imported for its scan(); the walk below belongs to the CLI only
} else {

if (process.argv.includes("--self-test")) runSelfTest();

const routeDirs = countDirs(APP_DIR);
if (routeDirs < MIN_ROUTE_DIRS) {
  console.error(
    `✖  Only ${routeDirs} route directories found under ${APP_DIR} (floor ${MIN_ROUTE_DIRS}) — the walk is broken, so a clean result would prove nothing.`,
  );
  process.exit(1);
}

const violations = scan(APP_DIR);

if (violations.length === 0) {
  console.log(
    `✔  No business route handlers found (${routeDirs} route directories walked, ${ALLOWED_ROUTES.size} allowlisted handlers re-checked).`,
  );
  process.exit(0);
}
console.error(
  `✖  ${violations.length} business route handler(s) — the only permitted route.ts are NextAuth and the auth bridges named in ALLOWED_ROUTES:`,
);
for (const v of violations) console.error(v);
process.exit(1);

}
