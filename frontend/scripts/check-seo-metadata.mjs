import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { isExcludedScanDir } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const APP_DIR = join(ROOT, "app");

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes("--self-test");

function normSep(p) {
  return p.replace(/\\/g, "/");
}

const AUTHENTICATED_LAYOUT_PATTERNS = [
  /app\/\(authenticated\)\/layout\.tsx$/,
  /app\/\(portal\)\/layout\.tsx$/,
  /app\/\(auth\)\/layout\.tsx$/,
  /app\/org-setup\/layout\.tsx$/,
  /app\/employee-onboarding\/layout\.tsx$/,
];

function isAuthenticatedLayout(relPath) {
  const norm = normSep(relPath);
  return AUTHENTICATED_LAYOUT_PATTERNS.some((re) => re.test(norm));
}

function hasRobotsNoIndex(content) {
  return (
    /robots\s*:\s*\{/.test(content) &&
    /index\s*:\s*false/.test(content) &&
    /follow\s*:\s*false/.test(content)
  );
}

function hasMissingRobots(content) {
  return !hasRobotsNoIndex(content);
}

function isPublicPageFile(relPath) {
  const norm = normSep(relPath);
  if (!norm.includes("/(public)/") && !norm.includes("app/(public)/")) return false;
  if (!norm.endsWith("/page.tsx")) return false;
  return true;
}

function hasDynamicSegment(relPath) {
  return relPath.includes("[");
}

function isIntentionallyIndexablePublicPage(relPath, content) {
  if (!isPublicPageFile(relPath)) return false;
  if (hasDynamicSegment(relPath)) return false;
  if (hasRobotsNoIndex(content)) return false;
  return true;
}

function hasRequiredPublicMetadata(content) {
  const hasTitle = /title\s*:/.test(content) || /"title"\s*:/.test(content);
  const hasDescription = /description\s*:/.test(content) || /"description"\s*:/.test(content);
  const hasCanonical = /alternates\s*:/.test(content) || /"alternates"\s*:/.test(content);
  return hasTitle && hasDescription && hasCanonical;
}

const FORBIDDEN_AUTH_IMPORTS = [
  "getServerAccess",
  "requireSession",
  "requirePermission",
  "serverGet",
  "serverFetch",
  "serverPost",
  "serverPatch",
  "serverDelete",
  "serverPut",
];

function hasAuthImport(content) {
  return FORBIDDEN_AUTH_IMPORTS.some((sym) => {
    const re = new RegExp(`\\b${sym}\\b`);
    return re.test(content);
  });
}

function isPublicDir(relPath) {
  const norm = normSep(relPath);
  return norm.includes("app/(public)/");
}

function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (isExcludedScanDir(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const f of walkDir(full)) results.push(f);
    } else {
      results.push(full);
    }
  }
  return results;
}

// A run that reaches no route files prints the same "OK" as a compliant tree.
// The floor is well under the real count (600+) but far above zero.
const MIN_ROUTE_FILES = 100;

function runChecks(appDir) {
  const failures = [];
  const all = walkDir(appDir);

  for (const full of all) {
    const rel = normSep(relative(join(appDir, ".."), full));
    if (!rel.endsWith(".tsx") && !rel.endsWith(".ts")) continue;

    const content = readFileSync(full, "utf8");

    if (isAuthenticatedLayout(rel)) {
      if (hasMissingRobots(content)) {
        failures.push(
          `FAIL [robots-missing] ${rel}\n  Authenticated layout must export metadata with robots: { index: false, follow: false }`,
        );
      }
    }

    if (isIntentionallyIndexablePublicPage(rel, content)) {
      if (!hasRequiredPublicMetadata(content)) {
        failures.push(
          `FAIL [public-meta-missing] ${rel}\n  Intentionally public page must export metadata with title, description, and alternates.canonical`,
        );
      }
    }

    if (isPublicDir(rel) && (rel.endsWith("/page.tsx") || rel.endsWith("/layout.tsx"))) {
      if (hasAuthImport(content)) {
        const found = FORBIDDEN_AUTH_IMPORTS.filter((s) => new RegExp(`\\b${s}\\b`).test(content));
        failures.push(
          `FAIL [auth-in-public] ${rel}\n  Public route must not import auth-gated symbols: ${found.join(", ")}`,
        );
      }
    }
  }

  return failures;
}

async function selfTest() {
  const tmpRoot = join(tmpdir(), `seo-fixture-${randomBytes(6).toString("hex")}`);
  const fakeAppDir = join(tmpRoot, "app");

  const authenticated = join(fakeAppDir, "(authenticated)");
  const orgSetup = join(fakeAppDir, "org-setup");
  const publicGroup = join(fakeAppDir, "(public)", "about");
  const publicGroupMissing = join(fakeAppDir, "(public)", "pricing");
  const publicAuthLeak = join(fakeAppDir, "(public)", "secret");

  for (const d of [authenticated, orgSetup, publicGroup, publicGroupMissing, publicAuthLeak]) {
    mkdirSync(d, { recursive: true });
  }

  writeFileSync(
    join(authenticated, "layout.tsx"),
    `export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }`,
  );

  writeFileSync(
    join(orgSetup, "layout.tsx"),
    `export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }`,
  );

  writeFileSync(
    join(publicGroup, "page.tsx"),
    `import type { Metadata } from "next";\nexport const metadata: Metadata = { title: "About", description: "About us", alternates: { canonical: "/about" } };\nexport default function Page() { return null; }`,
  );

  writeFileSync(
    join(publicGroupMissing, "page.tsx"),
    `export default function Page() { return null; }`,
  );

  writeFileSync(
    join(publicAuthLeak, "page.tsx"),
    `import type { Metadata } from "next";\nimport { getServerAccess } from "@/lib/rbac/get-server-access";\nexport const metadata: Metadata = { title: "Leak", description: "desc", alternates: { canonical: "/secret" } };\nexport default async function Page() { const a = await getServerAccess(); return null; }`,
  );

  let failures;
  try {
    failures = runChecks(fakeAppDir);
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }

  const robotsFail = failures.filter((f) => f.includes("[robots-missing]"));
  const publicMetaFail = failures.filter((f) => f.includes("[public-meta-missing]"));
  const authLeakFail = failures.filter((f) => f.includes("[auth-in-public]"));

  // The counts above hold even if these two predicates return a constant, because
  // no fixture separates their true branch from their false branch.
  const predicateCases = [
    ["hasRobotsNoIndex sees a complete noindex block", hasRobotsNoIndex("robots: { index: false, follow: false }") === true],
    ["hasRobotsNoIndex rejects a half-declared block", hasRobotsNoIndex("robots: { index: false }") === false],
    ["hasRobotsNoIndex rejects an indexable block", hasRobotsNoIndex("robots: { index: true, follow: true }") === false],
    ["hasRobotsNoIndex rejects a file with no robots key", hasRobotsNoIndex("export const metadata = { title: 'x' };") === false],
    ["hasDynamicSegment sees a route parameter", hasDynamicSegment("app/(public)/blog/[slug]/page.tsx") === true],
    ["hasDynamicSegment sees a catch-all", hasDynamicSegment("app/(public)/docs/[...path]/page.tsx") === true],
    ["hasDynamicSegment leaves a static route alone", hasDynamicSegment("app/(public)/pricing/page.tsx") === false],
  ];
  let predicatesOk = true;
  for (const [label, ok] of predicateCases) {
    if (!ok) {
      console.error(`SELF-TEST FAIL: ${label}`);
      predicatesOk = false;
    }
  }

  const pass =
    predicatesOk &&
    robotsFail.length === 2 &&
    publicMetaFail.length === 1 &&
    authLeakFail.length === 1;

  console.log("--- self-test fixtures ---");
  console.log(`robots-missing failures:     ${robotsFail.length}  (expected 2)`);
  for (const f of robotsFail) console.log("  " + f.split("\n")[0]);
  console.log(`public-meta-missing failures: ${publicMetaFail.length}  (expected 1)`);
  for (const f of publicMetaFail) console.log("  " + f.split("\n")[0]);
  console.log(`auth-in-public failures:      ${authLeakFail.length}  (expected 1)`);
  for (const f of authLeakFail) console.log("  " + f.split("\n")[0]);
  console.log("---");

  if (pass) {
    console.log("SELF-TEST PASS: all three failure modes bite as designed");
    process.exitCode = 0;
  } else {
    console.error("SELF-TEST FAIL: expected failure counts did not match");
    process.exitCode = 1;
  }
}

function main() {
  const reached = walkDir(APP_DIR).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts")).length;
  if (reached < MIN_ROUTE_FILES) {
    console.error(
      `check-seo-metadata: INCONCLUSIVE — the walk reached only ${reached} route file(s) ` +
        `(floor ${MIN_ROUTE_FILES}). This run proves nothing about robots or public metadata.`,
    );
    process.exitCode = 2;
    return;
  }
  const failures = runChecks(APP_DIR);
  if (failures.length === 0) {
    console.log(`check-seo-metadata: OK (${reached} route files scanned)`);
    return;
  }
  for (const f of failures) console.error(f);
  console.error(`\ncheck-seo-metadata: ${failures.length} violation(s) found`);
  process.exitCode = 1;
}

if (SELF_TEST) {
  selfTest().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
} else {
  main();
}
