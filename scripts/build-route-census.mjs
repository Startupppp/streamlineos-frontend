import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const APP_ROOT = join(ROOT, "frontend", "app");
const SNAPSHOT = join(ROOT, "docs", "specs", "build", "generated", "routes.snapshot.json");
const MANIFEST = join(ROOT, "docs", "specs", "build", "module", "01a-canonical-route-manifest-prd.md");

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
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
  return { version: 2, generatedAt: new Date().toISOString(), source: "frontend/app", count: rows.length, routes: rows, duplicates, bareDynamic, manifest };
}

function parseManifest() {
  if (!existsSync(MANIFEST)) return { current: [], final: [] };
  const current = [];
  const final = [];
  for (const line of readFileSync(MANIFEST, "utf8").split(/\r?\n/)) {
    if (!line.startsWith("| `PG-")) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    const id = cells[1]?.replaceAll("`", "");
    const isAdd = id?.startsWith("PG-ADD-");
    const currentPath = isAdd ? undefined : cells[2]?.match(/`([^`]+)`/)?.[1];
    const finalCell = isAdd ? (cells[2] ?? "") : (cells[3] ?? "");
    const disposition = finalCell.match(/·\s*([A-Z_]+)/)?.[1] ?? "KEEP";
    const finalPath = finalCell.match(/`([^`]+)`/)?.[1] ?? (finalCell.split("·")[0].trim().replace(/^same$/i, currentPath ?? "") || (disposition === "KEEP" ? currentPath : undefined));
    if (id && currentPath) current.push({ id, path: currentPath, disposition });
    if (id && finalPath && disposition !== "REMOVE" && disposition !== "CONSOLIDATE") final.push({ id, path: finalPath, disposition });
  }
  return { current, final };
}

function assertSnapshot(snapshot) {
  const errors = [];
  if (!snapshot.routes.length) errors.push("route census is empty");
  if (snapshot.duplicates.length) errors.push(`duplicate canonical routes: ${snapshot.duplicates.map((x) => x.path).join(", ")}`);
  if (snapshot.bareDynamic.length) errors.push(`bare dynamic segments: ${snapshot.bareDynamic.map((x) => x.path).join(", ")}`);
  return errors;
}

function compareSnapshots(actual, recorded) {
  const actualRoutes = actual.routes.map(({ path, file }) => `${path}|${file}`);
  const recordedRoutes = recorded.routes.map(({ path, file }) => `${path}|${file}`);
  const missing = actualRoutes.filter((route) => !recordedRoutes.includes(route));
  const stale = recordedRoutes.filter((route) => !actualRoutes.includes(route));
  return { missing, stale, countDrift: actual.count !== recorded.count };
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
  coldLoadSelfTest();
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
  const errors = [...assertSnapshot(snapshot), ...assertColdLoadGates(coldLoad)];
  if (process.argv.includes("--check")) {
    const recorded = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, "utf8")) : null;
    const drift = recorded ? compareSnapshots(snapshot, recorded) : { missing: [], stale: [], countDrift: true };
    if (errors.length || drift.countDrift || drift.missing.length || drift.stale.length) {
      for (const error of errors) console.error(error);
      if (drift.countDrift) console.error(`snapshot count drift: recorded=${recorded?.count ?? "missing"}, actual=${snapshot.count}`);
      if (drift.missing.length) console.error(`routes missing from snapshot: ${drift.missing.join(", ")}`);
      if (drift.stale.length) console.error(`stale routes in snapshot: ${drift.stale.join(", ")}`);
      process.exitCode = 1;
    } else console.log(`PASS ${snapshot.count} Build routes; snapshot is current; ${coldLoad.count} Build pages each pass their own canonical pattern to enforceRouteAccess (0 weak cold-load gates)`);
  } else {
    writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 2)}\n`);
    console.log(`Wrote ${snapshot.count} routes to ${SNAPSHOT}`);
  }
}
