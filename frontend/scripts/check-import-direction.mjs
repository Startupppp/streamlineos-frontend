#!/usr/bin/env node
/**
 * Import-direction gate (PRD §2.1).
 *
 * Two rules:
 *   shared-imports-feature: files under components/ must not import from features/
 *   cross-feature-import:   features/A must not import from features/B (A ≠ B)
 *
 * Uses a ratchet baseline — the gate fails if violation counts INCREASE beyond
 * the baseline. Lower the baseline after fixing violations and commit the change.
 *
 * TEST FILES ARE NOT SCANNED, as of 2026-09-02 (ticket 35). The walker excluded
 * *.spec.ts(x), of which this package has ZERO, and scanned *.test.ts(x), of
 * which it has 303 — so the intended exemption had never applied to anything.
 * 28 of the 222 cross-feature "violations" came from the
 * features/__tests__/*-a11y.test.tsx module sweep, a harness that imports every
 * feature on purpose; check-query-scope already carries this exemption for that
 * same harness. Both rules govern the PRODUCTION module graph — a test importing
 * a feature is not the inversion they forbid — so narrowing the corpus makes the
 * measurement match the rule.
 *
 * The 16 that left the count were NOT banked as headroom: BASELINE_CROSS_FEATURE
 * was lowered from 210 to the new measured 194 in the same change. Excluding a
 * corpus and keeping the old baseline is how a ratchet is laundered.
 *
 * Flags:
 *   --self-test   Run internal assertions against synthetic violations and exit.
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const REAL_ROOT = fileURLToPath(new URL("..", import.meta.url));

// 19 -> 3 -> 0 on 2026-09-07. The final 3 (notification bell, chat mobile bottom nav,
// Build project nav tree) were fixed using render-prop slots threaded through
// layout-client.tsx (app layer) so the shell never imports features directly.
const BASELINE_SHARED_IMPORTS_FEATURE = 0;
// 169 -> 0 on 2026-09-07. All remaining violations fixed by:
// renderer/list-view/import-export/timeline/approval-actions -> components/;
// notification-types/expense-constants/knowledge-routes/format-relative-time -> lib/;
// candidates -> hr/recruitment/candidates; users -> directory/users;
// ai-summaries -> build/ai-summaries; ai-drafts -> crm/ai-drafts;
// inbox -> notifications/unified-inbox; legal-shell -> landing;
// payment-providers-page -> payments; ESS pages -> owning HR features;
// dashboard widgets threaded as ReactNode slots; project-chat-page -> chat;
// useDashboardAccess cross-feature calls replaced with useCan+useModuleEnabled.
const BASELINE_CROSS_FEATURE = 0;

const EXCLUDED_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", ".git"]);

function* walkTs(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkTs(full);
    } else {
      const ext = extname(entry.name);
      if ((ext === ".ts" || ext === ".tsx") && !entry.name.endsWith(".d.ts")) {
        if (!/\.(spec|test)\.tsx?$/.test(entry.name)) {
          yield full;
        }
      }
    }
  }
}

const FROM_RE = /from\s+['"](@\/[^'"]+|\.\.?\/[^'"]+)['"]/g;
const DYNAMIC_RE = /import\(['"](@\/[^'"]+|\.\.?\/[^'"]+)['"]\)/g;

function extractImports(content) {
  const imports = [];
  for (const re of [FROM_RE, DYNAMIC_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (m[1]) imports.push(m[1]);
    }
  }
  return imports;
}

function resolveAlias(specifier) {
  if (specifier.startsWith("@/")) return specifier.slice(2);
  return null;
}

function classify(resolved) {
  if (!resolved) return null;
  if (resolved.startsWith("features/")) return "feature";
  if (resolved.startsWith("components/")) return "shared";
  if (resolved.startsWith("app/")) return "app";
  if (resolved.startsWith("lib/")) return "lib";
  return null;
}

function fileKind(rel) {
  if (rel.startsWith("features/")) return "feature";
  if (rel.startsWith("components/")) return "shared";
  if (rel.startsWith("app/")) return "app";
  if (rel.startsWith("lib/")) return "lib";
  return null;
}

function featureDomain(path) {
  const m = path.match(/^features\/([^/]+)/);
  return m ? m[1] : null;
}

function scanViolations(rootDir) {
  const violations = [];
  for (const filePath of walkTs(rootDir)) {
    const rel = relative(rootDir, filePath).replace(/\\/g, "/");
    if (rel.startsWith("scripts/")) continue;

    const kind = fileKind(rel);
    if (!kind) continue;

    const content = readFileSync(filePath, "utf8");
    for (const specifier of extractImports(content)) {
      const resolved = resolveAlias(specifier);
      if (!resolved) continue;
      const targetKind = classify(resolved);
      if (!targetKind) continue;

      if (kind === "shared" && targetKind === "feature") {
        violations.push({ file: rel, specifier, rule: "shared-imports-feature" });
      }

      if (kind === "feature" && targetKind === "feature") {
        const srcDomain = featureDomain(rel);
        const tgtDomain = featureDomain(resolved);
        if (srcDomain && tgtDomain && srcDomain !== tgtDomain) {
          violations.push({ file: rel, specifier, rule: "cross-feature-import" });
        }
      }
    }
  }
  return violations;
}

function runSelfTest() {
  console.log("Running self-test...\n");
  const synthDir = join(REAL_ROOT, ".check-import-direction-self-test");
  const featDir = join(synthDir, "features", "auth");
  const sharedDir = join(synthDir, "components", "layout");
  const feat2Dir = join(synthDir, "features", "billing");

  try {
    mkdirSync(featDir, { recursive: true });
    mkdirSync(sharedDir, { recursive: true });
    mkdirSync(feat2Dir, { recursive: true });

    writeFileSync(join(featDir, "widget.tsx"), 'export function Widget() { return null; }\n');
    writeFileSync(
      join(sharedDir, "shell.tsx"),
      'import { Widget } from "@/features/auth/widget";\nexport function Shell() { return null; }\n',
    );
    writeFileSync(
      join(feat2Dir, "page.tsx"),
      'import { Widget } from "@/features/auth/widget";\nexport function Page() { return null; }\n',
    );

    // A test file importing across features is the a11y module sweep, not an
    // architectural inversion. Pins the 2026-09-02 corpus narrowing.
    writeFileSync(
      join(feat2Dir, "page.test.tsx"),
      'import { Widget } from "@/features/auth/widget";\nit("renders", () => {});\n',
    );
    writeFileSync(
      join(sharedDir, "shell.test.tsx"),
      'import { Widget } from "@/features/auth/widget";\nit("renders", () => {});\n',
    );

    const violations = scanViolations(synthDir);
    const sharedVio = violations.filter((v) => v.rule === "shared-imports-feature");
    const crossVio = violations.filter((v) => v.rule === "cross-feature-import");

    if (violations.some((v) => v.file.includes(".test."))) {
      console.error("SELF-TEST FAIL: a *.test.tsx file was scanned; test files are outside both rules.");
      process.exitCode = 1;
      return;
    }

    if (sharedVio.length !== 1) {
      console.error(`SELF-TEST FAIL: expected 1 shared-imports-feature violation, got ${sharedVio.length}`);
      process.exitCode = 1;
      return;
    }
    if (crossVio.length !== 1) {
      console.error(`SELF-TEST FAIL: expected 1 cross-feature-import violation, got ${crossVio.length}`);
      process.exitCode = 1;
      return;
    }
    console.log("Self-test passed: shared-imports-feature and cross-feature-import detected correctly.\n");
  } finally {
    rmSync(synthDir, { recursive: true, force: true });
  }
}

const args = process.argv.slice(2);

/** Collapse repeated references to the same module from the same file to one edge. */
function dedupeEdges(violations) {
  const seen = new Set();
  return violations.filter((v) => {
    const key = `${v.rule}\u0000${v.file}\u0000${v.specifier}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

if (args.includes("--self-test")) {
  runSelfTest();
} else {
  // A violation is the EDGE (file -> module), not the number of times the edge is
  // written. `org-switcher.tsx` references
  // `@/features/settings/organization/leave-organization-control` twice -- once as a
  // static import and once inside a `dynamic(() => import(...))` -- and when this
  // detector learned to see dynamic imports that single architectural violation
  // started counting as two, reporting 20 against a baseline of 19 and failing the
  // gate as REGRESSED. Nothing had regressed: the distinct edge set was, and still is,
  // 19. Deduplicating is the fix. Raising the baseline to 20 would have laundered the
  // ratchet, and deleting a working import to chase the number would have changed
  // shipping code to satisfy a counting artifact.
  //
  // This does not weaken the rule. A shared component importing two DIFFERENT feature
  // modules is still two violations; only repeated references to the SAME module
  // collapse, which is exactly the granularity the rule is about.
  const violations = dedupeEdges(scanViolations(REAL_ROOT));
  if (args.includes("--list")) {
    for (const v of violations) console.log(`${v.rule}	${v.file}	${v.specifier}`);
  }
  const sharedCount = violations.filter((v) => v.rule === "shared-imports-feature").length;
  const crossCount = violations.filter((v) => v.rule === "cross-feature-import").length;

  let failed = false;

  if (sharedCount > BASELINE_SHARED_IMPORTS_FEATURE) {
    console.error(
      `shared-imports-feature: ${sharedCount} violations (baseline ${BASELINE_SHARED_IMPORTS_FEATURE}) — REGRESSED`,
    );
    for (const v of violations.filter((v) => v.rule === "shared-imports-feature")) {
      console.error(`  ${v.file}: ${v.specifier}`);
    }
    failed = true;
  } else {
    const delta = BASELINE_SHARED_IMPORTS_FEATURE - sharedCount;
    console.log(
      `shared-imports-feature: ${sharedCount}/${BASELINE_SHARED_IMPORTS_FEATURE} (${delta > 0 ? `${delta} fixed` : "at baseline"})`,
    );
  }

  if (crossCount > BASELINE_CROSS_FEATURE) {
    console.error(
      `cross-feature-import: ${crossCount} violations (baseline ${BASELINE_CROSS_FEATURE}) — REGRESSED`,
    );
    for (const v of violations.filter((v) => v.rule === "cross-feature-import")) {
      console.error(`  ${v.file}: ${v.specifier}`);
    }
    failed = true;
  } else {
    const delta = BASELINE_CROSS_FEATURE - crossCount;
    console.log(
      `cross-feature-import: ${crossCount}/${BASELINE_CROSS_FEATURE} (${delta > 0 ? `${delta} fixed` : "at baseline"})`,
    );
  }

  if (failed) process.exit(1);
  else console.log("\nImport direction: within baselines.");
}
