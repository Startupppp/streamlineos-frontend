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

function buildSnapshot() {
  const rows = walk(APP_ROOT)
    .map((file) => ({ path: routeFromFile(file), file: relative(ROOT, file).split("\\").join("/") }))
    .filter(({ path }) => path === "/build" || path.startsWith("/build/") || path === "/portal" || path.startsWith("/portal/") || path === "/client-portal" || path.startsWith("/client-portal/") || path === "/accept-invitation" || path === "/board/{shareToken}" || path === "/forms/{formToken}" || path === "/intake/{projectId}" || path === "/roadmap/{orgId}")
    .sort((a, b) => a.path.localeCompare(b.path) || a.file.localeCompare(b.file));
  const byPath = new Map();
  for (const row of rows) byPath.set(row.path, [...(byPath.get(row.path) ?? []), row.file]);
  const duplicates = [...byPath.entries()].filter(([, files]) => files.length > 1).map(([path, files]) => ({ path, files }));
  const bareDynamic = rows.filter(({ path }) => /\[[^\]]+\]/.test(path));
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
  const dynamic = { routes: [{ path: "/build/{projectId}" }], duplicates: [], bareDynamic: [{ path: "/build/[projectId]" }] };
  const drift = compareSnapshots({ count: 2, routes: [{ path: "/build", file: "a" }, { path: "/build/x", file: "b" }] }, { count: 1, routes: [{ path: "/build", file: "a" }] });
  const check = (name, value, expected) => {
    const failed = assertSnapshot(value).length > 0;
    if (failed !== expected) throw new Error(`self-test failed: ${name}`);
    console.log(`PASS ${name}`);
  };
  check("clean census", clean, false);
  check("duplicate detection", duplicate, true);
  check("bare dynamic detection", dynamic, true);
  if (!(drift.countDrift && drift.missing.length === 1 && drift.stale.length === 0)) throw new Error("self-test failed: snapshot drift detection");
  console.log("PASS snapshot drift detection");
}

if (process.argv.includes("--self-test")) selfTest();
else {
  const snapshot = buildSnapshot();
  const errors = assertSnapshot(snapshot);
  if (process.argv.includes("--check")) {
    const recorded = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, "utf8")) : null;
    const drift = recorded ? compareSnapshots(snapshot, recorded) : { missing: [], stale: [], countDrift: true };
    if (errors.length || drift.countDrift || drift.missing.length || drift.stale.length) {
      for (const error of errors) console.error(error);
      if (drift.countDrift) console.error(`snapshot count drift: recorded=${recorded?.count ?? "missing"}, actual=${snapshot.count}`);
      if (drift.missing.length) console.error(`routes missing from snapshot: ${drift.missing.join(", ")}`);
      if (drift.stale.length) console.error(`stale routes in snapshot: ${drift.stale.join(", ")}`);
      process.exitCode = 1;
    } else console.log(`PASS ${snapshot.count} Build routes; snapshot is current`);
  } else {
    writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 2)}\n`);
    console.log(`Wrote ${snapshot.count} routes to ${SNAPSHOT}`);
  }
}
