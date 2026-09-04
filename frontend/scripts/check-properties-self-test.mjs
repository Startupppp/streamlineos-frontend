#!/usr/bin/env node
/**
 * Bite-proof for check:properties — the composite gate that runs four structural
 * detectors plus madge.
 *
 * Each of the four structural sub-scripts already has its own `--self-test` proof,
 * and the madge cycle-detection is covered by `check:cycles:self-test`. This
 * composite runner proves that all four detectors bite for their intended reasons
 * and that the composition propagates failures.
 *
 * The madge step is excluded here because:
 *   a) It is covered by check:cycles:self-test, and
 *   b) npx madge@8 requires a network download on first run, so including it
 *      would make the composite timing non-deterministic.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const SCRIPTS_DIR = fileURLToPath(new URL(".", import.meta.url));

const SUB_SELF_TESTS = [
  {
    label: "check-no-business-routes: rejects a business route for the intended reason",
    args: [join(SCRIPTS_DIR, "check-no-business-routes.mjs"), "--self-test"],
  },
  {
    label: "check-no-arbitrary-colors: rejects a hardcoded color for the intended reason",
    args: [join(SCRIPTS_DIR, "check-no-arbitrary-colors.mjs"), "--self-test"],
  },
  {
    label: "check-no-effect-fetches: rejects a useEffect fetch for the intended reason",
    args: [join(SCRIPTS_DIR, "check-no-effect-fetches.mjs"), "--self-test"],
  },
  {
    label: "check-no-unlabeled-icon-buttons: rejects an unlabeled icon button for the intended reason",
    args: [join(SCRIPTS_DIR, "check-no-unlabeled-icon-buttons.mjs"), "--self-test"],
  },
];

const results = [];

for (const { label, args } of SUB_SELF_TESTS) {
  const r = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 60_000 });
  const code = r.status ?? 1;
  if (code !== 0 || r.error) {
    const detail = r.error ? r.error.message : (r.stderr ?? "").slice(0, 400);
    process.stderr.write(`[FAIL] ${label}\n  exit ${code}  ${detail}\n`);
    results.push(false);
  } else {
    process.stdout.write(`[pass] ${label}\n`);
    results.push(true);
  }
}

const passed = results.filter(Boolean).length;
process.stdout.write(`\n${passed}/${results.length} sub-self-tests passed (madge/cycles covered by check:cycles:self-test)\n`);
if (passed < results.length) process.exit(1);
