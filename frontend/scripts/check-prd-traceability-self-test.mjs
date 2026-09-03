#!/usr/bin/env node
/**
 * Bite-proof for check-prd-traceability.mjs (PRD-C104).
 *
 * A gate that has never been seen to fail is not evidence. Each case below copies the real PRD,
 * manifest and ticket tree into a temp directory, plants ONE known-bad mutation, and asserts the
 * gate exits 1 *for that specific reason* — matching on the failure code, not merely on non-zero.
 * A gate that fails for the wrong reason is a gate that will pass for the wrong reason later.
 *
 * The final case is the control: the unmutated tree must exit 0. Without it, a gate that always
 * failed would score a perfect run here.
 */

import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND_REPO = resolve(HERE, "..", "..");
const GATE = join(HERE, "check-prd-traceability.mjs");

const REL_PRD = join("architecture-refactor", "PRD-10-10-CODE-RELEASE-TODO.md");
const REL_MANIFEST = join(".scratch", "code-release-10-10-v2", "TRACEABILITY.md");
const REL_ISSUES = join(".scratch", "code-release-10-10-v2", "issues");

/** Build a fresh fixture tree containing only what the gate reads. */
function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "prd-trace-"));
  mkdirSync(join(root, "architecture-refactor"), { recursive: true });
  mkdirSync(join(root, ".scratch", "code-release-10-10-v2"), { recursive: true });
  cpSync(join(FRONTEND_REPO, REL_PRD), join(root, REL_PRD));
  cpSync(join(FRONTEND_REPO, REL_MANIFEST), join(root, REL_MANIFEST));
  cpSync(join(FRONTEND_REPO, REL_ISSUES), join(root, REL_ISSUES), { recursive: true });
  return root;
}

function runGate(root) {
  try {
    const stdout = execFileSync("node", [GATE], {
      env: { ...process.env, PRD_TRACEABILITY_ROOT: root },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, output: stdout };
  } catch (e) {
    return { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const read = (root, rel) => readFileSync(join(root, rel), "utf8");
const write = (root, rel, s) => writeFileSync(join(root, rel), s);

/**
 * Each case: mutate the fixture, then assert the gate fails carrying `expect`.
 * `expect: null` means "must pass".
 */
const cases = [
  {
    name: "control — the real tree passes",
    mutate: () => {},
    expect: null,
  },
  {
    name: "a PRD criterion loses its manifest row",
    mutate: (root) => {
      const m = read(root, REL_MANIFEST).split("\n").filter((l) => !l.startsWith("| PRD-C050 |"));
      write(root, REL_MANIFEST, m.join("\n"));
    },
    expect: "UNOWNED",
  },
  {
    name: "a criterion is assigned to two tickets in the manifest",
    mutate: (root) => {
      const lines = read(root, REL_MANIFEST).split("\n");
      const i = lines.findIndex((l) => l.startsWith("| PRD-C050 |"));
      lines.splice(i + 1, 0, "| PRD-C050 | 30 | 4. Database schema and migration quality |");
      write(root, REL_MANIFEST, lines.join("\n"));
    },
    expect: "DUPLICATE OWNER",
  },
  {
    name: "a ticket claims acceptance work that is in no PRD criterion",
    mutate: (root) => {
      const rel = join(REL_ISSUES, "01-prd-traceability-manifest.md");
      write(root, rel, read(root, rel).replace(
        /## Completion evidence/,
        "- [ ] **PRD-C999** — invent some scope nobody agreed to.\n\n## Completion evidence",
      ));
    },
    expect: "TICKET-ONLY",
  },
  {
    name: "a ticket paraphrases its criterion instead of quoting it",
    mutate: (root) => {
      const rel = join(REL_ISSUES, "02-schema-and-key-minimization.md");
      write(root, rel, read(root, rel).replace(
        /(\*\*PRD-C050\*\* — )Audit primary-key strategy/,
        "$1Have a quick look at primary keys",
      ));
    },
    expect: "TEXT DRIFT",
  },
  {
    name: "a ticket is ticked ahead of its PRD box",
    mutate: (root) => {
      const rel = join(REL_ISSUES, "02-schema-and-key-minimization.md");
      write(root, rel, read(root, rel).replace("- [ ] **PRD-C050**", "- [x] **PRD-C050**"));
    },
    expect: "STATE DIVERGENCE",
  },
  {
    name: "the manifest gives a criterion to a ticket that does not list it",
    mutate: (root) => {
      write(root, REL_MANIFEST, read(root, REL_MANIFEST).replace(
        "| PRD-C050 | 02 |",
        "| PRD-C050 | 30 |",
      ));
    },
    expect: "OWNER DISAGREEMENT",
  },
  {
    name: "restored module evidence is deleted from the PRD rather than ticked",
    mutate: (root) => {
      // PRD-C127 is Chat — one of the ten restored on 2026-09-03.
      const prd = read(root, REL_PRD).split("\n").filter((l) => !/\*\*\[PRD-C127\]\*\*/.test(l));
      write(root, REL_PRD, prd.join("\n"));
      const rel = join(REL_ISSUES, "12-chat.md");
      write(root, rel, read(root, rel).replace(/- \[ \] \*\*PRD-C127\*\*.*\n/, ""));
      write(root, REL_MANIFEST, read(root, REL_MANIFEST)
        .split("\n").filter((l) => !l.startsWith("| PRD-C127 |")).join("\n")
        .replace("- Ticket 12: 1", "- Ticket 12: 0"));
    },
    expect: "RESTORED EVIDENCE DELETED",
  },
  {
    name: "a coverage total drifts from the ticket it describes",
    mutate: (root) => {
      write(root, REL_MANIFEST, read(root, REL_MANIFEST).replace("- Ticket 02: 9", "- Ticket 02: 8"));
    },
    expect: "COVERAGE MISMATCH",
  },
  {
    name: "criteria are deleted wholesale, dropping under the vacuity floor",
    mutate: (root) => {
      const prd = read(root, REL_PRD).split("\n");
      let dropped = 0;
      const kept = prd.filter((l) => {
        if (/^\s*- \[[ x]\] \*\*\[PRD-C\d{3}\]\*\*/.test(l) && dropped < 20) {
          dropped += 1;
          return false;
        }
        return true;
      });
      write(root, REL_PRD, kept.join("\n"));
    },
    expect: "VACUITY FLOOR",
  },
];

let passed = 0;
const problems = [];

for (const c of cases) {
  const root = makeFixture();
  try {
    c.mutate(root);
    const { code, output } = runGate(root);
    if (c.expect === null) {
      if (code === 0) {
        passed += 1;
        console.log(`  PASS  ${c.name} — exit 0`);
      } else {
        problems.push(`${c.name}: expected exit 0, got ${code}\n${output}`);
        console.log(`  FAIL  ${c.name} — expected exit 0, got ${code}`);
      }
    } else if (code === 0) {
      problems.push(`${c.name}: gate PASSED a tree carrying a planted "${c.expect}" defect. It cannot bite.`);
      console.log(`  FAIL  ${c.name} — gate passed a known-bad tree`);
    } else if (!output.includes(c.expect)) {
      problems.push(`${c.name}: gate failed (exit ${code}) but not for "${c.expect}". Failing for the wrong reason is how a gate passes for the wrong reason later.\n${output}`);
      console.log(`  FAIL  ${c.name} — failed for the wrong reason`);
    } else {
      passed += 1;
      console.log(`  PASS  ${c.name} — exit ${code}, "${c.expect}"`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

console.log(`\ncheck-prd-traceability self-test: ${passed}/${cases.length} cases`);
if (problems.length > 0) {
  console.error("\nFAIL:\n" + problems.map((p) => `  ${p}`).join("\n\n"));
  process.exit(1);
}
console.log("PASS — the gate bites on every defect class it claims to cover.");
