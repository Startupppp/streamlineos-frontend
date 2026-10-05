import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const APP_ROOT = join(ROOT, "frontend", "app");
const SNAPSHOT = join(ROOT, "docs", "build-module", "audit", "generated", "routes.snapshot.json");
const ROUTE_DECISIONS = join(ROOT, "docs", "build-module", "experience", "routes-and-screen-decisions.md");
const CODE_MANIFEST = join(ROOT, "frontend", "lib", "build", "build-route-manifest.ts");

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name.startsWith("@")) continue;
    if (entry.isDirectory()) walk(full, files);
    else if (/^page\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function routeFromFile(file) {
  const rel = relative(APP_ROOT, file).split("\\").join("/");
  const segments = rel.split("/").slice(0, -1).filter((segment) => !/^\([^)]*\)$/.test(segment));
  return `/${segments.map((segment) => segment.replace(/^\[\.\.\.(.+)\]$/, "{...$1}").replace(/^\[(.+)\]$/, "{$1}")).join("/")}`.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function hasUninformativeParam(path) {
  return path.split("/").some((segment) => /^\{(\.\.\.)?id\}$/i.test(segment));
}

const AUTHENTICATED_ROOT = join(APP_ROOT, "(authenticated)");
const BUILD_ROOT = join(AUTHENTICATED_ROOT, "build");

export function canonicalPatternFromFile(file, authenticatedRoot = AUTHENTICATED_ROOT) {
  const rel = relative(authenticatedRoot, file).split("\\").join("/");
  const segments = rel
    .split("/")
    .slice(0, -1)
    .filter((segment) => !/^\([^)]*\)$/.test(segment) && !segment.startsWith("@"));
  return `/${segments.join("/")}`;
}

function balancedCall(source, openParen) {
  let depth = 0;
  for (let index = openParen; index < source.length; index += 1) {
    if (source[index] === "(") depth += 1;
    else if (source[index] === ")" && (depth -= 1) === 0) return source.slice(openParen, index + 1);
  }
  return "";
}

export function enforcedPatterns(source) {
  return [...source.matchAll(/\benforceRouteAccess\s*\(/g)]
    .map((match) => balancedCall(source, match.index + match[0].length - 1))
    .flatMap((args) => [...args.matchAll(/["'`]([^"'`]+)["'`]/g)].map((literal) => literal[1]));
}

function gateChainFiles(pageFile, authenticatedRoot = AUTHENTICATED_ROOT) {
  const files = [pageFile];
  let dir = join(pageFile, "..");
  for (;;) {
    const layout = join(dir, "layout.tsx");
    if (existsSync(layout)) files.push(layout);
    if (dir === authenticatedRoot || dir.length <= authenticatedRoot.length) break;
    dir = join(dir, "..");
  }
  return files;
}

export function coldLoadGateAudit() {
  const rows = walk(BUILD_ROOT).map((file) => ({
    pattern: canonicalPatternFromFile(file),
    file: relative(ROOT, file).split("\\").join("/"),
    patterns: gateChainFiles(file).flatMap((chained) => enforcedPatterns(readFileSync(chained, "utf8"))),
  }));
  const gaps = rows
    .filter(({ pattern, patterns }) => !patterns.includes(pattern))
    .sort((a, b) => a.pattern.localeCompare(b.pattern));
  return { count: rows.length, gaps };
}

const MIN_BUILD_PAGES = 60;

export function assertColdLoadGates(audit) {
  const errors = [];
  if (audit.count < MIN_BUILD_PAGES)
    errors.push(`cold-load gate audit swept ${audit.count} Build pages, fewer than the ${MIN_BUILD_PAGES} floor — the sweep resolved nothing and cannot report a clean tree`);
  if (audit.gaps.length)
    errors.push(
      `${audit.gaps.length} of ${audit.count} Build route(s) never pass their own canonical pattern to enforceRouteAccess, so a cold document load gates them on a shorter prefix:\n${audit.gaps.map((x) => `  ${x.pattern}  (${x.file})`).join("\n")}`,
    );
  return errors;
}

function buildSnapshot() {
  const rows = walk(APP_ROOT)
    .map((file) => ({ path: routeFromFile(file), file: relative(ROOT, file).split("\\").join("/") }))
    .filter(({ path }) => path === "/build" || path.startsWith("/build/") || path === "/portal" || path.startsWith("/portal/") || path === "/client-portal" || path.startsWith("/client-portal/") || path === "/accept-invitation" || path === "/board/{shareToken}" || path === "/forms/{formToken}" || path === "/intake/{projectId}" || path === "/roadmap/{orgId}")
    .sort((a, b) => a.path.localeCompare(b.path) || a.file.localeCompare(b.file));
  const byPath = new Map();
  for (const row of rows) byPath.set(row.path, [...(byPath.get(row.path) ?? []), row.file]);
  const duplicates = [...byPath.entries()].filter(([, files]) => files.length > 1).map(([path, files]) => ({ path, files }));
  const bareDynamic = rows.filter(({ path }) => hasUninformativeParam(path));
  const manifest = parseManifest();
  const buildPageCount = rows.filter(({ path }) => path === "/build" || path.startsWith("/build/")).length;
  return { version: 3, source: "frontend/app", count: rows.length, buildPageCount, relatedRouteCount: rows.length - buildPageCount, routes: rows, duplicates, bareDynamic, manifest };
}

export function parseCodeManifest(source) {
  return [...source.matchAll(/\broute:\s*"([^"]+)"\s*,\s*decision:\s*"(KEEP|CONSOLIDATE|MOVE|DELETE)"/g)]
    .map(([, route, decision]) => ({ route, decision }));
}

export function parseRouteDecisions(source) {
  const heading = source.match(/^## Existing routes\s*[—-]\s*(\d+) decisions\s*$/m);
  const section = source.split(/^## Existing routes[^\r\n]*\r?\n/m)[1]?.split(/^## /m)[0] ?? "";
  const decisions = section.split(/\r?\n/)
    .filter((line) => /^\|\s*`\/build(?:`|\/)/.test(line))
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      return {
        route: cells[1]?.match(/^`([^`]+)`$/)?.[1] ?? "",
        decision: cells[2] ?? "",
        destination: cells[3] ?? "",
      };
    });
  return { declaredCount: heading ? Number(heading[1]) : null, decisions };
}

function parseManifest() {
  const codePresent = existsSync(CODE_MANIFEST);
  const decisionsPresent = existsSync(ROUTE_DECISIONS);
  const code = codePresent ? parseCodeManifest(readFileSync(CODE_MANIFEST, "utf8")) : [];
  const { declaredCount, decisions } = decisionsPresent
    ? parseRouteDecisions(readFileSync(ROUTE_DECISIONS, "utf8"))
    : { declaredCount: null, decisions: [] };
  return {
    codeSource: relative(ROOT, CODE_MANIFEST).split("\\").join("/"),
    decisionsSource: relative(ROOT, ROUTE_DECISIONS).split("\\").join("/"),
    codePresent,
    decisionsPresent,
    declaredCount,
    code,
    decisions,
  };
}

function assertSnapshot(snapshot) {
  const errors = [];
  if (!snapshot.routes.length) errors.push("route census is empty");
  if (snapshot.duplicates.length) errors.push(`duplicate canonical routes: ${snapshot.duplicates.map((x) => x.path).join(", ")}`);
  if (snapshot.bareDynamic.length) errors.push(`bare dynamic segments: ${snapshot.bareDynamic.map((x) => x.path).join(", ")}`);
  return errors;
}

function duplicatesOf(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function assertCanonicalSources(snapshot, minBuildPages = MIN_BUILD_PAGES) {
  const errors = [];
  const { manifest } = snapshot;
  const physical = snapshot.routes
    .filter(({ path }) => path === "/build" || path.startsWith("/build/"))
    .map(({ file }) => canonicalPatternFromFile(resolve(ROOT, file)));
  if (physical.length < minBuildPages) errors.push(`Build page census swept ${physical.length} pages, fewer than the ${minBuildPages} floor`);
  if (snapshot.buildPageCount !== physical.length || snapshot.relatedRouteCount !== snapshot.count - physical.length)
    errors.push("Build and related route counts disagree with the physical route rows");
  if (!manifest.codePresent) errors.push(`missing Build route manifest: ${manifest.codeSource}`);
  if (!manifest.decisionsPresent) errors.push(`missing canonical route decisions: ${manifest.decisionsSource}`);
  if (manifest.code.length < minBuildPages) errors.push(`Build route manifest parsed ${manifest.code.length} entries, fewer than the ${minBuildPages} floor`);
  if (manifest.decisions.length < minBuildPages) errors.push(`canonical route decisions parsed ${manifest.decisions.length} entries, fewer than the ${minBuildPages} floor`);
  if (manifest.declaredCount !== manifest.decisions.length)
    errors.push(`route-decision heading count ${manifest.declaredCount ?? "missing"} disagrees with ${manifest.decisions.length} parsed existing routes`);
  for (const [name, values] of [
    ["physical Build pages", physical],
    ["Build route manifest", manifest.code.map(({ route }) => route)],
    ["canonical route decisions", manifest.decisions.map(({ route }) => route)],
  ]) {
    const duplicates = duplicatesOf(values);
    if (duplicates.length) errors.push(`duplicate ${name}: ${duplicates.join(", ")}`);
  }
  const physicalSet = new Set(physical);
  for (const [name, entries] of [
    ["Build route manifest", manifest.code],
    ["canonical route decisions", manifest.decisions],
  ]) {
    const listed = new Set(entries.map(({ route }) => route));
    const omitted = [...physicalSet].filter((route) => !listed.has(route));
    const extra = [...listed].filter((route) => !physicalSet.has(route));
    if (omitted.length) errors.push(`${name} omits physical Build pages: ${omitted.join(", ")}`);
    if (extra.length) errors.push(`${name} names routes without current Build pages: ${extra.join(", ")}`);
  }
  if (manifest.decisions.some(({ route, decision, destination }) => !route || !decision || !destination))
    errors.push("canonical route decisions contain an empty route, decision, or destination");
  return errors;
}

function compareSnapshots(actual, recorded) {
  const actualRoutes = actual.routes.map(({ path, file }) => `${path}|${file}`);
  const recordedRoutes = recorded.routes.map(({ path, file }) => `${path}|${file}`);
  const missing = actualRoutes.filter((route) => !recordedRoutes.includes(route));
  const stale = recordedRoutes.filter((route) => !actualRoutes.includes(route));
  return {
    missing,
    stale,
    countDrift: actual.count !== recorded.count,
    canonicalDrift: actual.version !== recorded.version || actual.buildPageCount !== recorded.buildPageCount || actual.relatedRouteCount !== recorded.relatedRouteCount || JSON.stringify(actual.manifest) !== JSON.stringify(recorded.manifest),
  };
}

function selfTest() {
  const clean = { routes: [{ path: "/build" }], duplicates: [], bareDynamic: [] };
  const duplicate = { routes: [{ path: "/build" }, { path: "/build" }], duplicates: [{ path: "/build" }], bareDynamic: [] };
  const bareRows = [
    { path: "/build/{projectId}", file: "a" },
    { path: "/build/{id}", file: "b" },
    { path: "/build/{...id}", file: "c" },
    { path: "/build/{ticketKey}", file: "d" },
  ];
  const bareFlagged = bareRows.filter(({ path }) => hasUninformativeParam(path));
  const dynamic = { routes: bareRows, duplicates: [], bareDynamic: bareFlagged };
  const drift = compareSnapshots({ count: 2, routes: [{ path: "/build", file: "a" }, { path: "/build/x", file: "b" }] }, { count: 1, routes: [{ path: "/build", file: "a" }] });
  const check = (name, value, expected) => {
    const failed = assertSnapshot(value).length > 0;
    if (failed !== expected) throw new Error(`self-test failed: ${name}`);
    console.log(`PASS ${name}`);
  };
  check("clean census", clean, false);
  check("duplicate detection", duplicate, true);
  check("bare dynamic detection", dynamic, true);
  if (bareFlagged.length !== 2) throw new Error("self-test failed: bare dynamic must flag {id} and {...id} and nothing else");
  if (routeFromFile(join(APP_ROOT, "build", "[id]", "page.tsx")) !== "/build/{id}")
    throw new Error("self-test failed: the census pipeline cannot produce the shape the bare-dynamic rule matches");
  console.log("PASS bare dynamic rule matches what the pipeline produces");
  if (!(drift.countDrift && drift.missing.length === 1 && drift.stale.length === 0)) throw new Error("self-test failed: snapshot drift detection");
  console.log("PASS snapshot drift detection");
  canonicalSourcesSelfTest();
  coldLoadSelfTest();
}

function canonicalSourcesSelfTest() {
  const code = parseCodeManifest('const rows = [{ route: "/build", decision: "KEEP", target: null }];');
  const parsed = parseRouteDecisions('## Existing routes — 1 decisions\n\n| Existing route | Decision | Target/destination | Screen contract | Opening |\n|---|---|---|---|---|\n| `/build` | Personalized redirect | `/build/command-center` | entry | redirect |\n\n## Proposed destinations');
  const clean = {
    count: 1,
    buildPageCount: 1,
    relatedRouteCount: 0,
    routes: [{ path: "/build", file: "frontend/app/(authenticated)/build/page.tsx" }],
    manifest: { codePresent: true, decisionsPresent: true, declaredCount: parsed.declaredCount, code, decisions: parsed.decisions },
  };
  if (assertCanonicalSources(clean, 1).length) throw new Error("self-test failed: matching physical/code/documented Build routes must pass");
  if (!assertCanonicalSources({ ...clean, manifest: { ...clean.manifest, decisions: [] } }, 1).some((error) => error.includes("omits physical Build pages")))
    throw new Error("self-test failed: a vacuous route-decision table must fail");
  if (!assertCanonicalSources({ ...clean, manifest: { ...clean.manifest, codePresent: false, code: [] } }, 1).some((error) => error.includes("missing Build route manifest")))
    throw new Error("self-test failed: a missing code manifest must fail");
  const changed = { ...clean, manifest: { ...clean.manifest, decisions: [{ ...clean.manifest.decisions[0], decision: "Consolidate" }] } };
  if (!compareSnapshots(changed, clean).canonicalDrift)
    throw new Error("self-test failed: changing a route decision must drift the generated snapshot");
  console.log("PASS canonical code/documentation/physical route parity and anti-vacuity");
}

function coldLoadSelfTest() {
  const page = join(BUILD_ROOT, "[projectId]", "qa", "page.tsx");
  if (canonicalPatternFromFile(page) !== "/build/[projectId]/qa")
    throw new Error("self-test failed: canonical pattern must keep [param] segments and drop route groups");
  if (canonicalPatternFromFile(join(APP_ROOT, "(authenticated)", "build", "(group)", "teams", "page.tsx")) !== "/build/teams")
    throw new Error("self-test failed: a route group segment must not appear in the canonical pattern");
  console.log("PASS canonical pattern derivation");

  const extracted = enforcedPatterns('await enforceRouteAccess("/build/[projectId]/qa");');
  if (extracted.length !== 1 || extracted[0] !== "/build/[projectId]/qa")
    throw new Error("self-test failed: the extractor cannot read the argument the rule is about");
  if (enforcedPatterns('import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";').length !== 0)
    throw new Error("self-test failed: an import line must not count as a call");
  if (enforcedPatterns('await enforceRouteAccess(buildPath(projectId, "qa"));').length !== 1)
    throw new Error("self-test failed: the extractor must read through a nested call, not stop at the first paren");
  console.log("PASS enforceRouteAccess argument extraction");

  const weak = { count: 83, gaps: [{ pattern: "/build/[projectId]/qa", file: "frontend/app/(authenticated)/build/[projectId]/qa/page.tsx" }] };
  if (assertColdLoadGates(weak).length !== 1)
    throw new Error("self-test failed: a route that never passes its own pattern must be reported");
  if (assertColdLoadGates({ count: 83, gaps: [] }).length !== 0)
    throw new Error("self-test failed: a tree with no gaps must pass");
  if (assertColdLoadGates({ count: 3, gaps: [] }).length !== 1)
    throw new Error("self-test failed: an empty sweep must fail instead of reporting a clean tree");
  console.log("PASS cold-load gate gap detection");

  if (JSON.stringify(buildSnapshot()).includes("coldLoad") || "coldLoad" in buildSnapshot())
    throw new Error("self-test failed: the cold-load verdict must never be persisted to the snapshot, or a stale recorded artifact could satisfy the gate");
  if (coldLoadGateAudit().count !== walk(BUILD_ROOT).length)
    throw new Error("self-test failed: the cold-load verdict must be recomputed from the live tree on every run");
  console.log("PASS cold-load verdict is recomputed live, never read from the snapshot");
}

if (process.argv.includes("--self-test")) selfTest();
else {
  const snapshot = buildSnapshot();
  const coldLoad = coldLoadGateAudit();
  const errors = [...assertSnapshot(snapshot), ...assertCanonicalSources(snapshot), ...assertColdLoadGates(coldLoad)];
  if (process.argv.includes("--check")) {
    const recorded = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, "utf8")) : null;
    const drift = recorded ? compareSnapshots(snapshot, recorded) : { missing: [], stale: [], countDrift: true, canonicalDrift: true };
    if (errors.length || drift.countDrift || drift.canonicalDrift || drift.missing.length || drift.stale.length) {
      for (const error of errors) console.error(error);
      if (drift.countDrift) console.error(`snapshot count drift: recorded=${recorded?.count ?? "missing"}, actual=${snapshot.count}`);
      if (drift.canonicalDrift) console.error(`canonical route sources or snapshot version drift: ${SNAPSHOT}`);
      if (drift.missing.length) console.error(`routes missing from snapshot: ${drift.missing.join(", ")}`);
      if (drift.stale.length) console.error(`stale routes in snapshot: ${drift.stale.join(", ")}`);
      process.exitCode = 1;
    } else console.log(`PASS ${snapshot.count} route patterns (${snapshot.buildPageCount} Build pages, ${snapshot.relatedRouteCount} related routes); canonical sources and snapshot are current; ${coldLoad.count} Build pages pass their own canonical pattern to enforceRouteAccess (0 weak cold-load gates)`);
  } else {
    if (errors.length) {
      for (const error of errors) console.error(error);
      process.exitCode = 1;
    } else {
      mkdirSync(dirname(SNAPSHOT), { recursive: true });
      writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 2)}\n`);
      console.log(`Wrote ${snapshot.count} route patterns (${snapshot.buildPageCount} Build pages, ${snapshot.relatedRouteCount} related routes) to ${SNAPSHOT}`);
    }
  }
}
