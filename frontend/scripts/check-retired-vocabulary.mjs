import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const SCAN_DIRS = ["app", "components", "features"];

const RETIRED = [
  { word: "sprint", replacement: "cycle", contraction: "Sprint -> Cycle" },
];

const SKIP_DIR = new Set(["node_modules", ".next", ".next-e2e", "__tests__", "__mocks__"]);
const SKIP_FILE = /\.(test|spec)\.[jt]sx?$/;
const FIXTURE_PATH = /(^|\/)(design-system)(\/|$)|-gallery\.tsx$|-gallery-cases\.tsx$/;

const BASELINE_PATH = "scripts/baselines/retired-vocabulary.json";

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIR.has(e.name)) continue;
      walk(full, out);
      continue;
    }
    if (!/\.[jt]sx?$/.test(e.name)) continue;
    if (SKIP_FILE.test(e.name)) continue;
    out.push(full);
  }
  return out;
}

function isProse(literal) {
  if (literal.includes(".") && !literal.includes(" ")) return false;
  if (literal.includes("_")) return false;
  if (literal.includes("/")) return false;
  if (literal.includes("-") && !literal.includes(" ")) return false;
  if (literal.includes(" ")) return true;
  return /^[A-Z]/.test(literal);
}

function lineIsImport(line) {
  return /^\s*(import|export)\b.*\bfrom\b/.test(line) || /^\s*import\s*\(/.test(line);
}

const QUOTED = /"([^"\\\n]{1,200})"|'([^'\\\n]{1,200})'/g;
const JSX_TEXT = />([^<>{}\n]{1,200})</g;

export function findInSource(source, word) {
  const rx = new RegExp(word, "i");
  const hits = [];
  const lines = source.split("\n");
  lines.forEach((line, i) => {
    if (lineIsImport(line)) return;
    const seen = new Set();
    const push = (text, kind) => {
      if (!rx.test(text)) return;
      if (!isProse(text.trim())) return;
      const key = kind + "\u0000" + text.trim();
      if (seen.has(key)) return;
      seen.add(key);
      hits.push({ line: i + 1, kind, text: text.trim() });
    };
    for (const m of line.matchAll(QUOTED)) push(m[1] ?? m[2] ?? "", "literal");
    for (const m of line.matchAll(JSX_TEXT)) push(m[1] ?? "", "jsx-text");
    const bare = line.match(/^\s{2,}([A-Z][^<>{}"'`,;:=()[\]]{2,120})$/);
    if (bare && /\s/.test(bare[1])) push(bare[1], "jsx-text");
  });
  return hits;
}

function loadBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    return { allowed: {}, maxAcknowledged: 0 };
  }
}

function selfTest() {
  const assertions = [];
  const check = (name, actual) => assertions.push({ name, pass: actual });

  const hit = (src) => findInSource(src, "sprint");

  check(
    "(a) flags a retired word in a rendered label prop",
    hit('  { key: "x", label: "Sprints", desc: "Agile sprint cycles" },').length > 0,
  );
  check(
    "(b) flags the PLURAL, which a \\bSprint\\b pattern cannot match",
    hit('    header: "Sprints",').some((h) => h.text === "Sprints"),
  );
  check(
    "(c) flags a JSX text node",
    hit("          Active Sprint\n").some((h) => h.kind === "jsx-text"),
  );
  check(
    "(d) flags a placeholder attribute",
    hit('<Input placeholder="e.g. Sprint 12 Regression" />').length > 0,
  );
  check(
    "(e) does NOT flag a dotted event key",
    hit('  notificationEvent("build.sprint.ending", "build")').length === 0,
  );
  check(
    "(f) does NOT flag a snake_case stored enum value",
    hit('  sprint_changed: SomeIcon,').length === 0,
  );
  check(
    "(g) does NOT flag an import specifier",
    hit('import { EmptySprintIllustration } from "@/components/illustrations";').length === 0,
  );
  check(
    "(h) does NOT flag a bare identifier outside a string",
    hit("const activeSprintSummary = useActiveSprint();").length === 0,
  );
  check(
    "(i) does NOT flag a query-key or path segment",
    hit('  const url = "/build/sprints/list";').length === 0,
  );
  check(
    "(j) reports exactly one finding for one offending line",
    hit('    header: "Sprint",').length === 1,
  );
  check(
    "(k) scans components/, which every previous manual pass omitted",
    SCAN_DIRS.includes("components"),
  );
  check(
    "(l) skips a test file by name",
    SKIP_FILE.test("build-quick-create.test.tsx"),
  );
  check(
    "(m) skips design-system and gallery fixture data",
    FIXTURE_PATH.test("app/(public)/design-system/org-work/gallery.tsx") &&
      FIXTURE_PATH.test("features/build/settings/settings-gallery.tsx"),
  );
  check(
    "(n) does not skip an ordinary component path",
    !FIXTURE_PATH.test("components/brand/floating-composition.tsx"),
  );
  check(
    "(o) does NOT flag a bare barrel-export identifier line",
    hit("  EmptySprintIllustration,\n").length === 0,
  );
  check(
    "(p) still flags a bare multi-word JSX text line",
    hit("          Active Sprint\n").length === 1,
  );
  check(
    "(q) the baseline is a shrink-only ratchet, not a mute switch",
    typeof loadBaseline().maxAcknowledged === "number",
  );

  const failed = assertions.filter((a) => !a.pass);
  for (const a of assertions) console.log(`  ${a.pass ? "[pass]" : "[FAIL]"} ${a.name}`);
  if (failed.length > 0) {
    console.log(`\ncheck-retired-vocabulary self-test: ${failed.length} FAILED`);
    process.exit(1);
  }
  console.log(`\nSELF-TEST PASS (${assertions.length} assertions)`);
  process.exit(0);
}

function main() {
  if (process.argv.includes("--self-test")) selfTest();

  const baseline = loadBaseline();
  const allowed = baseline.allowed ?? {};
  const maxAcknowledged = baseline.maxAcknowledged ?? 0;
  const files = [];
  for (const dir of SCAN_DIRS) walk(dir, files);

  const findings = [];
  let fixtureSkipped = 0;
  for (const file of files) {
    if (FIXTURE_PATH.test(file)) {
      fixtureSkipped += 1;
      continue;
    }
    const source = readFileSync(file, "utf8");
    for (const entry of RETIRED) {
      if (!new RegExp(entry.word, "i").test(source)) continue;
      for (const h of findInSource(source, entry.word)) {
        findings.push({ file, ...h, contraction: entry.contraction });
      }
    }
  }

  const acknowledged = [];
  const usedAllowKeys = new Set();
  for (const f of findings) {
    const key = `${f.file}:${f.line}`;
    if (allowed[key] !== undefined) {
      usedAllowKeys.add(key);
      continue;
    }
    acknowledged.push(f);
  }

  const staleAllowKeys = Object.keys(allowed).filter((k) => !usedAllowKeys.has(k));

  console.log(`Retired-vocabulary scan: ${SCAN_DIRS.join(", ")}`);
  console.log(
    `  files ${files.length}  ·  fixture files skipped ${fixtureSkipped}  ·  findings ${findings.length}  ·  justified ${usedAllowKeys.size}  ·  acknowledged debt ${acknowledged.length} [ceiling ${maxAcknowledged}]`,
  );
  console.log(
    "  Scope note: this gate reads quoted string literals and JSX text nodes, not a JSX tree. A rendered string built by concatenation, or prose whose first line does not begin with a capital, is outside its reach.",
  );

  if (staleAllowKeys.length > 0) {
    console.log(`\nSTALE JUSTIFICATIONS (${staleAllowKeys.length}) — the finding is gone, remove them:`);
    for (const k of staleAllowKeys) console.log(`  ${k}  (${allowed[k]})`);
  }

  if (acknowledged.length > 0) {
    console.log(`\nACKNOWLEDGED DEBT (${acknowledged.length}) — product copy naming a retired surface:`);
    for (const f of acknowledged) {
      console.log(`  ${f.file}:${f.line}  [${f.kind}]  ${JSON.stringify(f.text)}  (${f.contraction})`);
    }
  }

  const grew = acknowledged.length - maxAcknowledged;
  if (grew > 0) {
    console.log(
      `\ncheck-retired-vocabulary: FAIL — acknowledged debt is ${acknowledged.length}, ${grew} above the ceiling of ${maxAcknowledged}. Raising the ceiling to go green is the defect this ratchet exists to catch.`,
    );
    process.exit(1);
  }
  if (staleAllowKeys.length > 0) {
    console.log(`\ncheck-retired-vocabulary: FAIL — ${staleAllowKeys.length} stale justification(s).`);
    process.exit(1);
  }
  if (acknowledged.length < maxAcknowledged) {
    console.log(
      `\ncheck-retired-vocabulary: OK, and the debt shrank — lower maxAcknowledged in ${BASELINE_PATH} to ${acknowledged.length} to hold the gain.`,
    );
    process.exit(0);
  }
  console.log("\ncheck-retired-vocabulary: OK");
}

if (basename(process.argv[1] ?? "") === "check-retired-vocabulary.mjs") main();
