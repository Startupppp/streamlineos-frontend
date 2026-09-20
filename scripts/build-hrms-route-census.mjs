import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const APP_ROOT = join(ROOT, "frontend", "app");
const SNAPSHOT = join(ROOT, "docs", "specs", "hrms-module", "generated", "routes.snapshot.json");
const SNAPSHOT_VERSION = 1;
const HRMS_SURFACES = [
  { surface: "hr", prefix: "/hr" },
  { surface: "directory", prefix: "/directory" },
  { surface: "me", prefix: "/me" },
  { surface: "payroll", prefix: "/payroll" },
  { surface: "employee-onboarding", prefix: "/employee-onboarding" },
];
const BARE_PARAM_NAMES = new Set(["id"]);
const ENRICHMENT_FIELDS = ["productOwner", "disposition", "finalPath", "permission", "callers", "parent", "back"];

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/^page\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function toPosix(path) {
  return path.split("\\").join("/");
}

function routeSegments(appRoot, file) {
  return toPosix(relative(appRoot, file)).split("/").slice(0, -1).filter((segment) => !/^\([^)]*\)$/.test(segment));
}

function routeGroupsOf(appRoot, file) {
  return toPosix(relative(appRoot, file)).split("/").slice(0, -1).filter((segment) => /^\([^)]*\)$/.test(segment));
}

function segmentToPath(segment) {
  return segment.replace(/^\[\.\.\.(.+)\]$/, "{...$1}").replace(/^\[(.+)\]$/, "{$1}");
}

function segmentToId(segment) {
  return segment.replace(/^\[\.\.\.(.+)\]$/, "$$$1...").replace(/^\[(.+)\]$/, "$$$1");
}

function routeFromSegments(segments) {
  return `/${segments.map(segmentToPath).join("/")}`.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function stableIdFromSegments(segments) {
  return `HRM-PG-${segments.map(segmentToId).join(".")}`;
}

function surfaceOf(path) {
  return HRMS_SURFACES.find(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`))?.surface ?? null;
}

function dynamicParams(segments) {
  return segments.flatMap((segment) => {
    const match = segment.match(/^\[(?:\.\.\.)?(.+)\]$/);
    return match ? [match[1]] : [];
  });
}

function isBareDynamic(path, params) {
  return /\[[^\]]+\]/.test(path) || params.some((param) => BARE_PARAM_NAMES.has(param));
}

function emptyEnrichment() {
  return Object.fromEntries(ENRICHMENT_FIELDS.map((field) => [field, null]));
}

function collectRows(appRoot) {
  return walk(appRoot)
    .map((file) => {
      const segments = routeSegments(appRoot, file);
      const path = routeFromSegments(segments);
      return {
        id: stableIdFromSegments(segments),
        path,
        file: toPosix(relative(ROOT, file)),
        surface: surfaceOf(path),
        routeGroups: routeGroupsOf(appRoot, file),
        params: dynamicParams(segments),
      };
    })
    .filter(({ surface }) => surface !== null)
    .sort((a, b) => a.path.localeCompare(b.path) || a.file.localeCompare(b.file));
}

function buildSnapshot(appRoot, recorded) {
  const recordedById = new Map((recorded?.routes ?? []).map((row) => [row.id, row]));
  const routes = collectRows(appRoot).map((row) => {
    const enrichment = emptyEnrichment();
    const previous = recordedById.get(row.id);
    if (previous) for (const field of ENRICHMENT_FIELDS) enrichment[field] = previous[field] ?? null;
    return { ...row, ...enrichment };
  });
  const byPath = new Map();
  const byId = new Map();
  for (const row of routes) {
    byPath.set(row.path, [...(byPath.get(row.path) ?? []), row.file]);
    byId.set(row.id, [...(byId.get(row.id) ?? []), row.file]);
  }
  const duplicates = [...byPath.entries()].filter(([, files]) => files.length > 1).map(([path, files]) => ({ path, files }));
  const duplicateIds = [...byId.entries()].filter(([, files]) => files.length > 1).map(([id, files]) => ({ id, files }));
  const bareDynamic = routes.filter(({ path, params }) => isBareDynamic(path, params)).map(({ id, path, file, params }) => ({ id, path, file, params }));
  const unowned = routes.filter(({ productOwner }) => productOwner === null).map(({ id }) => id);
  const bySurface = Object.fromEntries(HRMS_SURFACES.map(({ surface }) => [surface, routes.filter((row) => row.surface === surface).length]));
  return { version: SNAPSHOT_VERSION, source: "frontend/app", scope: HRMS_SURFACES.map(({ prefix }) => prefix), count: routes.length, bySurface, routes, duplicates, duplicateIds, bareDynamic, unowned };
}

function assertSnapshot(snapshot, { requireOwners = false } = {}) {
  const errors = [];
  if (!snapshot.routes.length) errors.push("HRMS route census is empty");
  if (snapshot.duplicates.length) errors.push(`duplicate canonical routes: ${snapshot.duplicates.map((x) => x.path).join(", ")}`);
  if (snapshot.duplicateIds.length) errors.push(`duplicate stable ids: ${snapshot.duplicateIds.map((x) => x.id).join(", ")}`);
  if (snapshot.bareDynamic.length) errors.push(`bare dynamic segments: ${snapshot.bareDynamic.map((x) => x.path).join(", ")}`);
  if (requireOwners && snapshot.unowned.length) errors.push(`unowned routes: ${snapshot.unowned.join(", ")}`);
  return errors;
}

function routeKey({ id, path, file }) {
  return `${id}|${path}|${file}`;
}

function compareSnapshots(actual, recorded) {
  const actualKeys = new Set(actual.routes.map(routeKey));
  const recordedKeys = new Set(recorded.routes.map(routeKey));
  const missing = [...actualKeys].filter((key) => !recordedKeys.has(key));
  const stale = [...recordedKeys].filter((key) => !actualKeys.has(key));
  return { missing, stale, countDrift: actual.count !== recorded.count, versionDrift: recorded.version !== SNAPSHOT_VERSION };
}

function readRecorded() {
  return existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, "utf8")) : null;
}

function writeFixture(appRoot, files) {
  for (const file of files) {
    const full = join(appRoot, file);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, "export default function Page() { return null; }\n");
  }
}

function selfTest() {
  const appRoot = mkdtempSync(join(tmpdir(), "hrms-route-census-"));
  const results = [];
  const check = (name, passed) => {
    if (!passed) throw new Error(`self-test failed: ${name}`);
    results.push(name);
  };
  try {
    writeFixture(appRoot, [
      "(authenticated)/hr/page.tsx",
      "(authenticated)/hr/employees/[employeeId]/page.tsx",
      "(authenticated)/directory/page.tsx",
      "(authenticated)/me/pay/page.tsx",
      "(authenticated)/me/onboarding/page.test.tsx",
      "(authenticated)/payroll/runs/[runId]/page.tsx",
      "(authenticated)/timesheets/payroll/page.tsx",
      "(authenticated)/build/page.tsx",
      "employee-onboarding/page.tsx",
    ]);
    const clean = buildSnapshot(appRoot, null);
    check("scope keeps only /hr, /directory, /me, /payroll and /employee-onboarding pages", clean.count === 6 && clean.routes.every((row) => row.surface !== null) && !clean.routes.some((row) => row.path === "/build" || row.path === "/timesheets/payroll"));
    check("page.test.tsx siblings are not routes", !clean.routes.some((row) => row.file.endsWith("page.test.tsx")));
    check("clean census passes assertions", assertSnapshot(clean).length === 0);
    check("dynamic segments become named params with stable ids", clean.routes.some((row) => row.path === "/hr/employees/{employeeId}" && row.id === "HRM-PG-hr.employees.$employeeId" && row.params[0] === "employeeId"));
    check("unauthenticated onboarding gate records no route group", clean.routes.some((row) => row.path === "/employee-onboarding" && row.routeGroups.length === 0));
    check("placeholders are null until enrichment", clean.routes.every((row) => ENRICHMENT_FIELDS.every((field) => row[field] === null)));
    check("--require-owners rejects unowned rows", assertSnapshot(clean, { requireOwners: true }).some((error) => error.startsWith("unowned routes")));
    check("generation is deterministic", JSON.stringify(buildSnapshot(appRoot, null)) === JSON.stringify(clean));

    const enrichedRecorded = { ...clean, routes: clean.routes.map((row) => (row.path === "/hr" ? { ...row, productOwner: "hrms", disposition: "KEEP" } : row)) };
    const regenerated = buildSnapshot(appRoot, enrichedRecorded);
    check("regeneration preserves enrichment by stable id", regenerated.routes.some((row) => row.path === "/hr" && row.productOwner === "hrms" && row.disposition === "KEEP") && regenerated.unowned.length === 5);

    writeFixture(appRoot, ["(authenticated)/hr/cases/[id]/page.tsx"]);
    check("bare [id] param is rejected", assertSnapshot(buildSnapshot(appRoot, null)).some((error) => error.startsWith("bare dynamic segments: /hr/cases/{id}")));
    rmSync(join(appRoot, "(authenticated)/hr/cases"), { recursive: true });

    writeFixture(appRoot, ["(authenticated)/(hub)/hr/page.tsx"]);
    const duplicated = buildSnapshot(appRoot, null);
    check("route-group twin of /hr is a duplicate canonical route", assertSnapshot(duplicated).some((error) => error.startsWith("duplicate canonical routes: /hr")) && duplicated.duplicateIds.length === 1);
    rmSync(join(appRoot, "(authenticated)/(hub)"), { recursive: true });

    const missingDrift = compareSnapshots(clean, { version: SNAPSHOT_VERSION, count: clean.count - 1, routes: clean.routes.filter((row) => row.path !== "/me/pay") });
    check("a page added after the snapshot is reported missing", missingDrift.countDrift && missingDrift.missing.length === 1 && missingDrift.missing[0].includes("/me/pay") && missingDrift.stale.length === 0);

    const staleDrift = compareSnapshots(clean, { version: SNAPSHOT_VERSION, count: clean.count + 1, routes: [...clean.routes, { id: "HRM-PG-hr.retired", path: "/hr/retired", file: "frontend/app/(authenticated)/hr/retired/page.tsx" }] });
    check("a deleted page still in the snapshot is reported stale", staleDrift.countDrift && staleDrift.stale.length === 1 && staleDrift.stale[0].includes("/hr/retired") && staleDrift.missing.length === 0);

    const movedDrift = compareSnapshots(clean, { version: SNAPSHOT_VERSION, count: clean.count, routes: clean.routes.map((row) => (row.path === "/hr" ? { ...row, file: "frontend/app/(authenticated)/(hub)/hr/page.tsx" } : row)) });
    check("a moved page file is reported as missing plus stale without count drift", !movedDrift.countDrift && movedDrift.missing.length === 1 && movedDrift.stale.length === 1);
    check("snapshot version drift is reported", compareSnapshots(clean, { version: SNAPSHOT_VERSION + 1, count: clean.count, routes: clean.routes }).versionDrift);
  } finally {
    rmSync(appRoot, { recursive: true, force: true });
  }
  for (const name of results) console.log(`PASS ${name}`);
}

function reportCheck(snapshot, recorded, errors) {
  const drift = recorded ? compareSnapshots(snapshot, recorded) : { missing: [], stale: [], countDrift: true, versionDrift: true };
  const failed = errors.length || drift.countDrift || drift.versionDrift || drift.missing.length || drift.stale.length;
  if (!failed) {
    console.log(`PASS ${snapshot.count} HRMS routes (${Object.entries(snapshot.bySurface).map(([surface, count]) => `${surface}=${count}`).join(", ")}); snapshot is current`);
    return;
  }
  for (const error of errors) console.error(error);
  if (drift.versionDrift) console.error(`snapshot version drift: recorded=${recorded?.version ?? "missing"}, expected=${SNAPSHOT_VERSION}`);
  if (drift.countDrift) console.error(`snapshot count drift: recorded=${recorded?.count ?? "missing"}, actual=${snapshot.count}`);
  if (drift.missing.length) console.error(`routes missing from snapshot: ${drift.missing.join(", ")}`);
  if (drift.stale.length) console.error(`stale routes in snapshot: ${drift.stale.join(", ")}`);
  process.exitCode = 1;
}

if (process.argv.includes("--self-test")) selfTest();
else {
  const recorded = readRecorded();
  const snapshot = buildSnapshot(APP_ROOT, recorded);
  const errors = assertSnapshot(snapshot, { requireOwners: process.argv.includes("--require-owners") });
  if (process.argv.includes("--check")) reportCheck(snapshot, recorded, errors);
  else if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    mkdirSync(dirname(SNAPSHOT), { recursive: true });
    writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 2)}\n`);
    console.log(`Wrote ${snapshot.count} HRMS routes to ${toPosix(relative(ROOT, SNAPSHOT))}`);
  }
}
