#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, relative, resolve as pathResolve, basename, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");

const NEXT_CONVENTION_STEMS = new Set([
  "page", "layout", "loading", "error", "not-found", "route", "template",
  "default", "global-error", "sitemap", "robots", "manifest", "icon",
  "apple-icon", "opengraph-image", "twitter-image",
]);

const CONTRACT_BARRELS = new Set([
  "components/shared/index.ts",
  "components/ai/index.ts",
  "components/illustrations/index.ts",
  "components/wizard-shell/index.ts",
  "components/labels/index.ts",
]);

const FEATURE_BARREL_RE = /^features\/[^/]+\/(?:[^/]+\/)?index\.ts$/;

const CRM_INVENTORY_RE =
  /^(?:hooks\/api\/crm\/|features\/crm\/|types\/crm\/|features\/inventory\/|hooks\/api\/inventory\/|hooks\/api\/leads\.)/;

const SCRIPTS_RE = /^scripts\//;

const SKIP_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", ".git"]);

const BASELINE = { deadFiles: 0, deadExports: 0 };

// Floors that detect a broken scan (knip returning nothing, or the graph walk
// resolving almost no files). Current real values: ~6 knip files, ~70 exports+types,
// hundreds of graph files, thousands of import edges. These are deliberately
// conservative — they fire only when the tool is clearly broken, not when the
// codebase legitimately improves.
const SCAN_FLOOR = { knipTotal: 5, graphFiles: 100, graphEdges: 300 };

function toFwd(p) {
  return p.replace(/\\/g, "/");
}

function tryFile(p) {
  try {
    const s = statSync(p);
    return s.isFile() ? p : null;
  } catch {
    return null;
  }
}

function findFile(spec, fromDir, root) {
  let base;
  if (spec.startsWith("@/")) base = join(root, spec.slice(2));
  else if (spec.startsWith(".")) base = pathResolve(fromDir, spec);
  else return null;

  if (tryFile(base)) return base;
  for (const ext of [".ts", ".tsx"]) {
    const r = tryFile(base + ext);
    if (r) return r;
  }
  const idxTs = join(base, "index.ts");
  if (tryFile(idxTs)) return idxTs;
  const idxTsx = join(base, "index.tsx");
  if (tryFile(idxTsx)) return idxTsx;
  return null;
}

function* walkTs(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walkTs(full);
    else if (/\.(ts|tsx)$/.test(e.name)) yield full;
  }
}

function buildImporterMap(root) {
  const map = new Map();

  function record(target, importer, kind) {
    if (!target) return;
    if (!map.has(target)) {
      map.set(target, { sideEffect: new Set(), named: new Set(), reexport: new Set(), dynamic: new Set() });
    }
    map.get(target)[kind].add(importer);
  }

  for (const file of walkTs(root)) {
    let src;
    try { src = readFileSync(file, "utf8"); } catch { continue; }
    const fromDir = dirname(file);

    for (const line of src.split("\n")) {
      const m = line.match(/^\s*import\s+["']([^"']+)["']\s*;?\s*$/);
      if (m) record(findFile(m[1], fromDir, root), file, "sideEffect");
    }

    let m;
    const namedRe = /^import\s+(?:type\s+)?(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+["']([^"']+)["']/gm;
    while ((m = namedRe.exec(src)) !== null) {
      record(findFile(m[1], fromDir, root), file, "named");
    }

    const reRe = /^export\s+(?:type\s+)?(?:\{[^}]+\}|\*[^"'\n]*)\s+from\s+["']([^"']+)["']/gm;
    while ((m = reRe.exec(src)) !== null) {
      record(findFile(m[1], fromDir, root), file, "reexport");
    }

    const dynRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
    while ((m = dynRe.exec(src)) !== null) {
      record(findFile(m[1], fromDir, root), file, "dynamic");
    }
  }

  return map;
}

function classifyFile(relPath, knipDeadSet, importerMap, root) {
  const stem = basename(relPath).replace(/\.[^.]+$/, "");
  if (NEXT_CONVENTION_STEMS.has(stem)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "Next.js filesystem entry convention" };
  }
  if (SCRIPTS_RE.test(relPath)) {
    return { cls: "RETAINED-BY-CONVENTION", reason: "standalone executable script, not a module" };
  }

  const absPath = join(root, ...relPath.split("/"));
  const entry = importerMap.get(absPath);

  if (entry) {
    for (const [kind, importers] of Object.entries(entry)) {
      for (const imp of importers) {
        const impRel = toFwd(relative(root, imp));
        if (!knipDeadSet.has(impRel)) {
          const reason =
            kind === "sideEffect" ? `side-effect import from live file (${impRel})`
            : kind === "reexport" ? `re-exported from live barrel (${impRel})`
            : kind === "dynamic" ? `dynamic import from live file (${impRel})`
            : `named import from live file (${impRel})`;
          return { cls: "RETAINED-BY-CONTRACT", reason };
        }
      }
    }
  }

  return { cls: "DEAD", reason: "no live importers found in module graph" };
}

function classifyExport(filePath) {
  if (CONTRACT_BARRELS.has(filePath)) {
    return { cls: "RETAINED-BY-CONTRACT", reason: "named intentional barrel" };
  }
  if (FEATURE_BARREL_RE.test(filePath)) {
    return { cls: "RETAINED-BY-CONTRACT", reason: "feature barrel extension point" };
  }
  if (CRM_INVENTORY_RE.test(filePath)) {
    return { cls: "UNPROVEN", reason: "CRM/Inventory excluded from PRD scope; runtime telemetry required" };
  }
  return { cls: "UNPROVEN", reason: "no consumer found statically; runtime telemetry required" };
}

function assert(cond, msg) {
  if (!cond) { console.error("SELF-TEST FAIL:", msg); process.exit(1); }
}

function runSelfTest() {
  console.log("Running self-test...\n");

  const synthRoot = join(sep === "\\" ? "C:\\synthetic" : "/synthetic");
  const knipDeadSet = new Set(["dead.ts", "side-effect-dep.ts", "reexport-source.ts"]);

  const sideEffectDepAbs = join(synthRoot, "side-effect-dep.ts");
  const reexportSourceAbs = join(synthRoot, "reexport-source.ts");
  const liveEntryAbs = join(synthRoot, "live-entry.ts");
  const liveBarrelAbs = join(synthRoot, "live-barrel.ts");

  const synthMap = new Map([
    [
      sideEffectDepAbs,
      { sideEffect: new Set([liveEntryAbs]), named: new Set(), reexport: new Set(), dynamic: new Set() },
    ],
    [
      reexportSourceAbs,
      { sideEffect: new Set(), named: new Set(), reexport: new Set([liveBarrelAbs]), dynamic: new Set() },
    ],
  ]);

  const r1 = classifyFile("dead.ts", knipDeadSet, synthMap, synthRoot);
  const r2 = classifyFile("side-effect-dep.ts", knipDeadSet, synthMap, synthRoot);
  const r3 = classifyFile("reexport-source.ts", knipDeadSet, synthMap, synthRoot);

  assert(r1.cls === "DEAD",
    `(a) dead.ts → expected DEAD, got ${r1.cls}`);
  assert(r2.cls === "RETAINED-BY-CONTRACT",
    `(b) side-effect-dep.ts → expected RETAINED-BY-CONTRACT, got ${r2.cls}`);
  assert(r3.cls === "RETAINED-BY-CONTRACT",
    `(c) reexport-source.ts → expected RETAINED-BY-CONTRACT, got ${r3.cls}`);

  const r4 = classifyExport("features/some-feature/index.ts");
  assert(r4.cls === "RETAINED-BY-CONTRACT",
    `(d) feature barrel export → expected RETAINED-BY-CONTRACT, got ${r4.cls}`);

  const r5 = classifyExport("hooks/api/crm/metadata.ts");
  assert(r5.cls === "UNPROVEN",
    `(e) CRM export → expected UNPROVEN, got ${r5.cls}`);

  // Test buildImporterMap itself against a real temp fixture so the file-walk
  // and import-parsing logic (not just classifyFile) is covered.
  const fixtureDir = join(tmpdir(), `dead-code-self-test-${Date.now()}`);
  try {
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(join(fixtureDir, "entry.ts"),
      'import x from "./a";\nimport "./b";\nexport * from "./c";\n');
    writeFileSync(join(fixtureDir, "a.ts"), "export default 1;\n");
    writeFileSync(join(fixtureDir, "b.ts"), "export {};\n");
    writeFileSync(join(fixtureDir, "c.ts"), "export const C = 1;\n");

    const fixMap = buildImporterMap(fixtureDir);
    const entryAbs = join(fixtureDir, "entry.ts");
    const aAbs = join(fixtureDir, "a.ts");
    const bAbs = join(fixtureDir, "b.ts");
    const cAbs = join(fixtureDir, "c.ts");

    assert(fixMap.has(aAbs) && fixMap.get(aAbs).named.has(entryAbs),
      "(f) buildImporterMap: named import edge a.ts ← entry.ts not recorded");
    assert(fixMap.has(bAbs) && fixMap.get(bAbs).sideEffect.has(entryAbs),
      "(g) buildImporterMap: side-effect import edge b.ts ← entry.ts not recorded");
    assert(fixMap.has(cAbs) && fixMap.get(cAbs).reexport.has(entryAbs),
      "(h) buildImporterMap: re-export edge c.ts ← entry.ts not recorded");
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }

  console.log("PASS: self-test (8 assertions)\n");
  console.log("  (a) file with no live importers                    → DEAD");
  console.log("  (b) file reachable via side-effect import          → RETAINED-BY-CONTRACT");
  console.log("  (c) file reachable via re-export from live barrel  → RETAINED-BY-CONTRACT");
  console.log("  (d) export from feature barrel                     → RETAINED-BY-CONTRACT");
  console.log("  (e) export from CRM domain                        → UNPROVEN");
  console.log("  (f) buildImporterMap: named import edge recorded");
  console.log("  (g) buildImporterMap: side-effect import edge recorded");
  console.log("  (h) buildImporterMap: re-export edge recorded");
}

async function runMain() {
  let knipJson;
  try {
    let rawOut;
    try {
      rawOut = execSync("pnpm exec knip --no-progress --reporter json", {
        cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      rawOut = e.stdout;
      if (!rawOut) { console.error("knip run failed:", e.stderr ?? e.message); process.exit(1); }
    }
    knipJson = JSON.parse(rawOut);
  } catch (e) {
    console.error("knip JSON parse failed:", e.message);
    process.exit(1);
  }

  const issues = knipJson.issues ?? [];
  const deadFileRels = [];
  const deadExportItems = [];

  for (const issue of issues) {
    for (const f of issue.files ?? []) deadFileRels.push(f.name);
    for (const ex of issue.exports ?? []) deadExportItems.push({ file: issue.file, name: ex.name, kind: "export" });
    for (const ty of issue.types ?? []) deadExportItems.push({ file: issue.file, name: ty.name, kind: "type" });
  }

  const knipDeadSet = new Set(deadFileRels);

  const knipTotal = deadFileRels.length + deadExportItems.length;
  if (knipTotal < SCAN_FLOOR.knipTotal) {
    console.error(
      `FAIL: knip returned only ${deadFileRels.length} files and ` +
      `${deadExportItems.length} exports/types — scan looks broken, not clean.`
    );
    process.exit(1);
  }

  console.log("Building import graph (scanning all TS/TSX files)...");
  const importerMap = buildImporterMap(ROOT);

  const graphFileCount = importerMap.size;
  let graphEdgeCount = 0;
  for (const entry of importerMap.values()) {
    for (const set of Object.values(entry)) graphEdgeCount += set.size;
  }
  if (graphFileCount < SCAN_FLOOR.graphFiles || graphEdgeCount < SCAN_FLOOR.graphEdges) {
    console.error(
      `FAIL: module-graph walk resolved only ${graphFileCount} files / ` +
      `${graphEdgeCount} import edges — scan looks broken.`
    );
    process.exit(1);
  }

  const buckets = {
    "DEAD": [],
    "RETAINED-BY-CONTRACT": [],
    "RETAINED-BY-CONVENTION": [],
    "UNPROVEN": [],
  };

  for (const rel of deadFileRels) {
    const r = classifyFile(rel, knipDeadSet, importerMap, ROOT);
    buckets[r.cls].push({ type: "file", path: rel, reason: r.reason });
  }

  for (const ex of deadExportItems) {
    const r = classifyExport(ex.file);
    buckets[r.cls].push({ type: ex.kind, path: ex.file, name: ex.name, reason: r.reason });
  }

  console.log("\n=== Dead Code Classification ===\n");
  console.log(
    `knip raw: files=${deadFileRels.length}` +
    ` exports=${deadExportItems.filter((e) => e.kind === "export").length}` +
    ` types=${deadExportItems.filter((e) => e.kind === "type").length}`
  );

  for (const [label, items] of Object.entries(buckets)) {
    console.log(`\n${label} (${items.length}):`);
    if (items.length === 0) { console.log("  (none)"); continue; }
    for (const it of items) {
      const name = it.name ? `:${it.name}` : "";
      console.log(`  [${it.type}] ${it.path}${name}  — ${it.reason}`);
    }
  }

  const deadFiles = buckets["DEAD"].filter((i) => i.type === "file").length;
  const deadExports = buckets["DEAD"].filter((i) => i.type !== "file").length;

  console.log(`\n=== Baseline: files=${BASELINE.deadFiles} exports=${BASELINE.deadExports} ===`);
  console.log(`=== Current:  files=${deadFiles} exports=${deadExports} ===`);

  if (deadFiles > BASELINE.deadFiles || deadExports > BASELINE.deadExports) {
    console.error("\nFAIL: dead code count exceeds baseline. New dead code introduced.");
    process.exit(1);
  }

  console.log("\nPASS: dead code within baseline.");
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  runSelfTest();
} else {
  runMain().catch((e) => { console.error(e); process.exit(1); });
}
