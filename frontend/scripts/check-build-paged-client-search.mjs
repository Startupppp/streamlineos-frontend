#!/usr/bin/env node
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BUILD_FEATURES = join(ROOT, "features", "build");

const PROXIMITY_LINES = 12;

const ALLOWLIST = new Map([
  [
    "features/build/cycles/cycles-page.tsx",
    "useCycles returns all cycles — no server-side pagination",
  ],
  [
    "features/build/automations/automations-page.tsx",
    "useAutomations returns unbounded list",
  ],
  [
    "features/build/modules/modules-page.tsx",
    "useModules returns unbounded list",
  ],
  [
    "features/build/workflow/workflow-page.tsx",
    "filters in-memory workflow statuses and transitions — no server pagination",
  ],
  [
    "features/build/cycles/cycle-detail-page.tsx",
    "filters in-memory board state — not a server-paginated list",
  ],
  [
    "features/build/epics/epics-page.tsx",
    "filters in-memory board state — not a server-paginated list",
  ],
  [
    "features/build/settings/project-settings-views-page.tsx",
    "PRE-EXISTING GAP: useViews is cursor-paged; filter is client-side; requires a separate ticket",
  ],
  [
    "features/build/settings/project-settings-fields-page.tsx",
    "useProjectCustomFields returns ProjectCustomField[] — unbounded list, no cursor pagination",
  ],
  [
    "features/build/qa/runs/run-execution-page.tsx",
    "useTestRunDetail returns TestRunDetail with results[] embedded — single run detail, not a paginated list",
  ],
]);

function hasProximityMatch(source) {
  const lines = source.split("\n");
  const searchIdxs = [];
  const filterIdxs = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("debouncedSearch")) searchIdxs.push(i);
    if (lines[i].includes(".filter(")) filterIdxs.push(i);
  }
  for (const s of searchIdxs) {
    for (const f of filterIdxs) {
      if (Math.abs(s - f) <= PROXIMITY_LINES) return true;
    }
  }
  return false;
}

function* walkTsx(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkTsx(full);
    else if (
      entry.name.endsWith(".tsx") &&
      !entry.name.endsWith(".test.tsx") &&
      !entry.name.endsWith(".spec.tsx") &&
      !entry.name.endsWith(".test-harness.tsx")
    ) {
      yield full;
    }
  }
}

function scan(buildRoot, frontendRoot) {
  const hits = [];
  let total = 0;
  for (const file of walkTsx(buildRoot)) {
    total++;
    const src = readFileSync(file, "utf8");
    if (hasProximityMatch(src)) {
      hits.push(relative(frontendRoot, file).replace(/\\/g, "/"));
    }
  }
  return { hits, total };
}

if (process.argv.includes("--self-test")) {
  const tmpDir = mkdtempSync(join(tmpdir(), "paged-search-gate-"));
  const fakeFile = join(tmpDir, "fake-incidents-page.tsx");
  writeFileSync(
    fakeFile,
    [
      '"use client";',
      "export function FakePage() {",
      "  const q = listFilters.debouncedSearch.toLowerCase();",
      "  const displayed = all.filter((i) => i.title.toLowerCase().includes(q));",
      "  return null;",
      "}",
    ].join("\n"),
  );
  const { hits } = scan(tmpDir, tmpDir);
  rmSync(tmpDir, { recursive: true, force: true });
  const caught = hits.length > 0;
  console.log(
    `self-test: ${caught ? "PASS — violation detected as expected" : "FAIL — gate did not fire on injected violation"}`,
  );
  process.exit(caught ? 0 : 1);
}

const { hits, total } = scan(BUILD_FEATURES, ROOT);
const violations = hits.filter((h) => !ALLOWLIST.has(h));

console.log(
  `real-source: scanned ${total} Build tsx files; ${hits.length} have debouncedSearch+filter within ${PROXIMITY_LINES} lines`,
);

if (violations.length > 0) {
  console.error("VIOLATIONS — not in allowlist:");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

const gaps = hits.filter((h) => {
  const reason = ALLOWLIST.get(h) ?? "";
  return reason.includes("PRE-EXISTING GAP");
});
if (gaps.length > 0) {
  console.log("known pre-existing gaps (need separate tickets):");
  for (const g of gaps) console.log(`  ${g} — ${ALLOWLIST.get(g)}`);
}

console.log(
  `real-source: PASS — ${hits.length} occurrence(s) all accounted for (${hits.length - gaps.length} acceptable, ${gaps.length} pre-existing gap)`,
);
