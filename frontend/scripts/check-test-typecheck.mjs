#!/usr/bin/env node
/**
 * Gate: the frontend's test files are typechecked.
 *
 * THE HOLE THIS CLOSES. `tsconfig.json` — the only program `pnpm type-check`
 * compiles — carries these four entries in `exclude`:
 *
 *     "**\/__tests__/**", "**\/*.test.ts", "**\/*.test.tsx",
 *     "**\/*.spec.ts",   "**\/*.spec.tsx"
 *
 * so not one of the 338 test files in this package has ever been in a program.
 * Jest cannot stand in for it either: `next/jest` transpiles through SWC, which
 * ERASES types outright — there is no diagnostics switch to turn on. A spec can
 * therefore call a method that no longer exists, or hand a hook the wrong
 * argument shape, and the suite still reports green. That is how a spec stops
 * testing anything without anybody noticing.
 *
 * This is the frontend twin of the backend's `check:test-typecheck`
 * (backend commit 71d9f880) and deliberately behaves the same way.
 *
 * SCOPE. `tsconfig.test.json` is `tsconfig.json` with those four globs dropped
 * from `exclude`. Application code stays in the program because the specs import
 * it, but an error in application code is NOT this gate's to fail on —
 * `pnpm type-check` already owns it and failing here too would report one
 * regression as two. Any such error is printed under its own loud heading so
 * nothing is silently swallowed.
 *
 * MEASURED BEFORE DESIGNING (2026-09-03, at head):
 *   - 842 errors over 338 test files with nothing wired.
 *   - 703 of them were ONE missing type registration: `@testing-library/jest-dom`
 *     is imported by `jest.setup.js`, but that file is `.js` and `include` lists
 *     only .ts/.tsx/.mts, so the global `jest.Matchers` augmentation never
 *     loaded. `tsconfig.test.json` puts `jest.setup.js` in the program via
 *     `files`, which is the real wiring rather than a suppression: 842 -> 139.
 *   - the remaining 139 across 45 files were genuine.
 *
 * Usage:
 *   node scripts/check-test-typecheck.mjs             # normal gate
 *   node scripts/check-test-typecheck.mjs --self-test # proves the gate bites
 *
 * NOTE: the typecheck subprocess is given NODE_OPTIONS=--max-old-space-size=8192,
 *       the same heap `pnpm type-check` uses. A crashed tsc prints no
 *       diagnostics, which greps as "0 errors" — this script treats a non-zero
 *       exit with no parseable diagnostics as a CRASH and fails, rather than
 *       reporting a clean tree. That false pass is a known trap in this repo.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const resolvePath = (rel) => fileURLToPath(new URL(rel, import.meta.url));

const FRONTEND_ROOT = resolvePath("../");
const TSC = resolvePath("../node_modules/typescript/bin/tsc");
const PROJECT = "tsconfig.test.json";

/**
 * The BASELINE.
 *
 * 0 means this is a HARD GATE, not a ratchet: every error the gate found when it
 * was introduced was fixed, and any new one fails the build. If you are reading a
 * number above 0 here, that number is BASELINED, NOT FIXED — the gate is then a
 * ratchet that may only ever fall, and the script says so out loud on every run.
 *
 * Starting number when the gate was introduced: 139 errors across 45 files.
 * Every one was fixed in the change that introduced this gate, and the tree was
 * re-measured at 0 before the number below was set. Nothing is suppressed and
 * nothing is baselined. Never raise this to absorb a new failure.
 */
const BASELINE = 0;

/** A diagnostic line, as tsc emits it: `path/to/file.ts(12,7): error TS1234: ...` */
const DIAGNOSTIC = /^([^\s(][^(]*)\((\d+),(\d+)\): error (TS\d+): /;

/**
 * The tree this gate is responsible for. These are exactly the four globs
 * `tsconfig.json` excludes, which is what makes them invisible to every other
 * gate — and therefore this gate's to own.
 */
const isOwned = (file) =>
  file.split("/").includes("__tests__") || /\.(test|spec)\.tsx?$/.test(file);

function runTypecheck(project = PROJECT, extraEnv = {}) {
  return spawnSync(process.execPath, [TSC, "--noEmit", "-p", project], {
    cwd: FRONTEND_ROOT,
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192", ...extraEnv },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function parse(result) {
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  const owned = [];
  const foreign = [];

  for (const line of output.split("\n")) {
    const match = DIAGNOSTIC.exec(line);
    if (!match) continue;
    const file = match[1].replace(/\\/g, "/");
    (isOwned(file) ? owned : foreign).push(line);
  }

  return { output, owned, foreign };
}

/**
 * A non-zero exit with nothing this script could parse is a crash, not a clean
 * tree. An out-of-memory tsc prints "FATAL ERROR: ... Ineffective mark-compacts"
 * and exits 134; a bad project path prints TS5058 with no line/column. Both grep
 * as "0 errors".
 */
const crashed = (result, owned, foreign) =>
  (result.error !== undefined || result.status !== 0) && owned.length === 0 && foreign.length === 0;

function reportCrash(result, output) {
  console.error(
    `check-test-typecheck: tsc exited ${String(result.status)}` +
      (result.signal ? ` (signal ${result.signal})` : "") +
      (result.error ? ` (spawn error ${String(result.error.message)})` : "") +
      " with no parseable diagnostics. That is a CRASH, not a clean tree — an " +
      "out-of-memory tsc prints nothing and greps as zero errors. Not reporting this as a pass.",
  );
  if (output.trim()) console.error(output.slice(0, 4000));
}

function reportForeign(foreign) {
  if (foreign.length === 0) return;
  const files = new Set(foreign.map((line) => DIAGNOSTIC.exec(line)[1]));
  console.log(
    `\n=========================== NOT THIS GATE'S SCOPE ===========================\n` +
      `${String(foreign.length)} error(s) in ${String(files.size)} file(s) OUTSIDE the test globs.\n` +
      `These belong to \`pnpm type-check\`, which fails on them. Listed here so they\n` +
      `are never silently swallowed, but they do not decide this gate's exit code.\n` +
      `=============================================================================`,
  );
  for (const line of foreign) console.log("  " + line);
}

function selfTest() {
  const dir = join(FRONTEND_ROOT, ".check-test-typecheck-selftest");
  const project = join(dir, "tsconfig.selftest.json");

  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  /*
   * The fixture lives OUTSIDE the real source tree so a crashed run cannot leave
   * a defect in a directory another agent is working in. It is named `.test.ts`
   * so the REAL `isOwned` predicate — not a special case — is what classifies it.
   *
   * Three plants, one control:
   *   1. a call to a method that no longer exists. This is the release's actual
   *      failure mode and the thing SWC's type erasure hides.
   *   2. an arity error, the largest genuine cluster the gate found (46x TS2554).
   *   3. an error in a NON-test file, which must land in `foreign`, not `owned`.
   *   4. CONTROL: a jest-dom matcher, which must NOT error. If the `files:
   *      ["jest.setup.js"]` registration in tsconfig.test.json ever regresses,
   *      703 errors come back and this line is the first to say so.
   */
  writeFileSync(
    join(dir, "planted.test.ts"),
    [
      'import { plantedHelper } from "./planted-source";',
      "",
      "class Importer {",
      "  beginCommit(): void {}",
      "}",
      "",
      "function requiresTwo(a: string, b: string): string {",
      "  return a + b;",
      "}",
      "",
      'it("plants", () => {',
      "  const importer = new Importer();",
      "  importer.commit();",
      '  requiresTwo("only-one-arg");',
      "  expect(document.body).toBeInTheDocument();",
      "  plantedHelper();",
      "});",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(dir, "planted-source.ts"),
    [
      "export function plantedHelper(): number {",
      '  return "not a number";',
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  /*
   * `include` is narrowed to the fixture directory so the self-test is seconds
   * rather than the two minutes a whole-repo compile costs; `extends` still
   * inherits the real strict compilerOptions AND the real `files:
   * ["jest.setup.js"]`, resolved relative to tsconfig.test.json, so the jest-dom
   * control below is a genuine test of the shipped registration.
   */
  writeFileSync(
    project,
    JSON.stringify({ extends: "../tsconfig.test.json", include: ["./*.ts"] }, null, 2),
    "utf8",
  );

  let bites;
  let crash;
  try {
    bites = parse(runTypecheck(".check-test-typecheck-selftest/tsconfig.selftest.json"));
    // A project path that does not exist makes tsc exit non-zero printing TS5058,
    // which carries no (line,column) and so parses to zero diagnostics — the same
    // shape an out-of-memory tsc produces. Proves the crash branch end to end.
    crash = runTypecheck(".check-test-typecheck-selftest/does-not-exist.json");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  const failures = [];

  const ownedNames = bites.owned.map((line) => DIAGNOSTIC.exec(line)[1]);
  const foreignNames = bites.foreign.map((line) => DIAGNOSTIC.exec(line)[1]);

  const missingMethod = bites.owned.filter((line) => /TS2339.*'commit'/.test(line));
  if (missingMethod.length === 0)
    failures.push(
      "the gate did not catch a call to a method that does not exist (TS2339 on 'commit'). " +
        "That is the exact defect SWC's type erasure hides, so a gate that misses it is worthless.",
    );

  const wrongArity = bites.owned.filter((line) => /TS2554/.test(line));
  if (wrongArity.length === 0)
    failures.push("the gate did not catch the planted arity error (TS2554).");

  if (!foreignNames.some((f) => f.endsWith("planted-source.ts")))
    failures.push(
      "the error planted in a NON-test file was not classified as out of scope. The gate " +
        "would then fail on application-code errors that `pnpm type-check` already owns.",
    );

  if (ownedNames.some((f) => f.endsWith("planted-source.ts")))
    failures.push("a non-test file was counted as owned. The owned/foreign split is wrong.");

  const jestDomBroken = [...bites.owned, ...bites.foreign].filter((line) =>
    /toBeInTheDocument/.test(line),
  );
  if (jestDomBroken.length > 0)
    failures.push(
      "the jest-dom matcher control FAILED: `expect(...).toBeInTheDocument()` did not " +
        "typecheck, so the `files: [\"jest.setup.js\"]` registration in tsconfig.test.json is " +
        "no longer loading @testing-library/jest-dom's global augmentation. That regression " +
        "alone is worth 703 errors.\n    " +
        jestDomBroken.join("\n    "),
    );

  const crashParsed = parse(crash);
  if (!crashed(crash, crashParsed.owned, crashParsed.foreign))
    failures.push(
      "a crashed tsc was NOT detected as a crash. A tsc that dies prints no diagnostics and " +
        "greps as zero errors; reporting that as a pass is the known false-pass trap here.",
    );

  if (failures.length > 0) {
    console.error("check-test-typecheck --self-test FAIL:");
    for (const failure of failures) console.error("  - " + failure);
    console.error("\n--- planted run output ---\n" + bites.output.slice(0, 4000));
    process.exit(1);
  }

  console.log("check-test-typecheck --self-test PASS. Proved, in a throwaway tree:");
  console.log("  1. a call to a method that no longer exists is caught:");
  for (const line of missingMethod) console.log("       " + line);
  console.log("  2. a wrong-arity call is caught:");
  for (const line of wrongArity) console.log("       " + line);
  console.log("  3. an error outside the test globs is reported but not owned:");
  for (const line of bites.foreign) console.log("       " + line);
  console.log("  4. jest-dom matchers typecheck, so the 703-error registration is live.");
  console.log(
    `  5. a crashed tsc (exit ${String(crash.status)}, 0 parseable diagnostics) is refused, not reported clean.`,
  );
  process.exit(0);
}

function gate() {
  const result = runTypecheck();
  const { output, owned, foreign } = parse(result);

  if (crashed(result, owned, foreign)) {
    reportCrash(result, output);
    process.exit(result.status === 0 ? 1 : (result.status ?? 1));
  }

  const files = new Set(owned.map((line) => DIAGNOSTIC.exec(line)[1]));

  if (owned.length > BASELINE) {
    console.error(
      `check-test-typecheck: ${String(owned.length)} type error(s) in ${String(files.size)} test ` +
        `file(s), against a baseline of ${String(BASELINE)}.`,
    );
    for (const line of owned) console.error("  " + line);
    console.error(
      "\nTest files are in NO other typecheck: tsconfig.json excludes __tests__/, *.test.ts(x)\n" +
        "and *.spec.ts(x), and next/jest transpiles through SWC, which erases types with no\n" +
        "diagnostics switch. So jest stays green over a spec that calls a method which no\n" +
        "longer exists. Fix the spec — or delete it, if what it tested is gone.",
    );
    reportForeign(foreign);
    process.exit(1);
  }

  if (owned.length < BASELINE) {
    console.log(
      `check-test-typecheck: ${String(owned.length)} error(s), BELOW the baseline of ` +
        `${String(BASELINE)}. Lower BASELINE in scripts/check-test-typecheck.mjs to ` +
        `${String(owned.length)} so the ground you just gained cannot be given back.`,
    );
    for (const line of owned) console.log("  " + line);
    reportForeign(foreign);
    process.exit(1);
  }

  if (BASELINE > 0) {
    console.log(
      `check-test-typecheck: ${String(owned.length)} error(s) in ${String(files.size)} test file(s), ` +
        `AT the baseline.\n` +
        `!! THESE ARE BASELINED, NOT FIXED. This gate is a ratchet that may only fall; it is\n` +
        `!! not evidence that the test tree typechecks. ${String(owned.length)} specs are still\n` +
        `!! compiling against signatures nobody has verified.`,
    );
    for (const line of owned) console.log("  " + line);
    reportForeign(foreign);
    process.exit(0);
  }

  console.log(
    "check-test-typecheck: all test files typecheck clean under the repo's strict settings\n" +
      "(tsconfig.test.json). This is a HARD GATE at zero, not a baseline — nothing is\n" +
      "suppressed and nothing is ratcheted.",
  );
  reportForeign(foreign);
  process.exit(0);
}

if (process.argv.includes("--self-test")) selfTest();
else gate();
