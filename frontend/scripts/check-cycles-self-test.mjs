#!/usr/bin/env node
/**
 * Bite-proof for check:cycles (madge --circular) in the frontend repository.
 *
 * Creates two minimal TypeScript files that mutually import each other in a
 * temporary directory, runs madge on them, and asserts:
 *
 *   a) madge exits non-zero (the gate WOULD fire if a cycle existed)
 *   b) madge names at least one cycle file in its output (the failure is the
 *      intended one, not a crash)
 *
 * One npx call to avoid a double download on first run.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const tmp = mkdtempSync(join(tmpdir(), "fe-check-cycles-self-test-"));
const results = [];

try {
  const cycleDir = join(tmp, "cycle");
  mkdirSync(cycleDir);
  writeFileSync(join(cycleDir, "a.ts"), `import './b';\nexport const a = 1;\n`);
  writeFileSync(join(cycleDir, "b.ts"), `import './a';\nexport const b = 2;\n`);

  const r = spawnSync(
    "npx",
    ["--yes", "madge@8", "--circular", "--extensions", "ts,tsx", cycleDir],
    { encoding: "utf8", shell: true, timeout: 180_000 },
  );

  const code = r.status ?? 1;
  const out = (r.stdout ?? "") + (r.stderr ?? "");

  if (r.error) {
    process.stderr.write(`[FAIL] spawn error: ${r.error.message}\n`);
    results.push(false);
  } else if (code === 0) {
    process.stderr.write(
      `[FAIL] madge exits 0 on a known cycle — the gate cannot detect regressions\n` +
        `  stdout: ${r.stdout.slice(0, 300)}\n`,
    );
    results.push(false);
  } else {
    process.stdout.write(`[pass] madge exits non-zero (${code}) on a planted cycle\n`);
    results.push(true);

    const namesCycle = out.includes("a.ts") || out.includes("b.ts");
    if (namesCycle) {
      process.stdout.write(`[pass] madge names the cycle files in its output\n`);
      results.push(true);
    } else {
      process.stderr.write(
        `[FAIL] madge exited ${code} but output does not name either cycle file\n` +
          `  combined output: ${out.slice(0, 400)}\n`,
      );
      results.push(false);
    }
  }
} finally {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

const passed = results.filter(Boolean).length;
process.stdout.write(`\n${passed}/${results.length} checks passed\n`);
if (passed < results.length) process.exit(1);
