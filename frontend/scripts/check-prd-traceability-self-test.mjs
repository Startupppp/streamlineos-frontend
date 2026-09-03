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
 *
 * ── Why the restored-evidence cases are GENERATED ──────────────────────────────────────────────
 * This file used to pin exactly ONE of the ten restored ids (PRD-C127). MEASURED: a commit that
 * lowered MIN_CRITERIA 195 -> 194, deleted `"PRD-C115": "Home"` from the gate, and deleted PRD-C115
 * from the PRD, the manifest and ticket 06 left BOTH scripts green — self-test 10/10 PASS, gate exit
 * 0 with "PASS — every criterion has exactly one owner" over 194 criteria. Nine of the ten were
 * removable that way, which is the exact recurrence PRD-C017 forbids: 60 carried "Proven" boxes once
 * rested on deleted text. The cases now come FROM the pinned map, so deleting an entry deletes a
 * passing case and changes the `N/N` line a reviewer reads.
 */

import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  LEGACY_UNIDENTIFIED,
  RESTORED_MODULE_EVIDENCE,
} from "./check-prd-traceability-pins.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND_REPO = resolve(HERE, "..", "..");
const GATE = join(HERE, "check-prd-traceability.mjs");

const REL_PRD = join("architecture-refactor", "PRD-10-10-CODE-RELEASE-TODO.md");
const REL_MANIFEST = join(".scratch", "code-release-10-10-v2", "TRACEABILITY.md");
const REL_ISSUES = join(".scratch", "code-release-10-10-v2", "issues");

/**
 * The two pinned corpora are themselves anti-vacuity floors. A run that generates fewer cases than
 * there are pins has lost sight of the corpus, so the counts are asserted before any case runs.
 */
const RESTORED_IDS = Object.keys(RESTORED_MODULE_EVIDENCE);
const EXPECTED_RESTORED = 10;
const EXPECTED_LEGACY = 37;

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
  // One case per pinned id, generated from RESTORED_MODULE_EVIDENCE itself. Each performs the FULL
  // tidy-up — PRD, ticket file, manifest row and the ticket's coverage total — so that the
  // restored-evidence pin is the ONLY check left that can catch it. A mutation that deleted the PRD
  // line alone would be caught by UNOWNED and would prove nothing about the pin.
  ...RESTORED_IDS.map((id) => ({
    name: `restored module evidence ${id} (${RESTORED_MODULE_EVIDENCE[id]}) is deleted rather than ticked`,
    mutate: (root) => {
      write(
        root,
        REL_PRD,
        read(root, REL_PRD)
          .split("\n")
          .filter((l) => !l.includes(`**[${id}]**`))
          .join("\n"),
      );
      const issuesDir = join(root, REL_ISSUES);
      const owner = readdirSync(issuesDir)
        .filter((f) => /^\d{2}-.+\.md$/.test(f))
        .find((f) => readFileSync(join(issuesDir, f), "utf8").includes(`**${id}**`));
      if (!owner) throw new Error(`${id} is carried by no ticket file — the fixture is wrong`);
      const rel = join(REL_ISSUES, owner);
      write(
        root,
        rel,
        read(root, rel)
          .split("\n")
          .filter((l) => !l.includes(`**${id}**`))
          .join("\n"),
      );
      const ticket = owner.slice(0, 2);
      const manifest = read(root, REL_MANIFEST)
        .split("\n")
        .filter((l) => !l.startsWith(`| ${id} |`))
        .join("\n");
      write(
        root,
        REL_MANIFEST,
        manifest.replace(
          new RegExp(`^- Ticket ${ticket}: (\\d+)$`, "m"),
          (_line, n) => `- Ticket ${ticket}: ${Number(n) - 1}`,
        ),
      );
    },
    expect: "RESTORED EVIDENCE DELETED",
  })),
  {
    name: "an id-less criterion is un-ticked, leaving an unowned acceptance criterion",
    mutate: (root) => {
      // The exact edit a later ticket makes when it finds the work regressed. Before the
      // UNIDENTIFIED CRITERION pass this left the gate at exit 0.
      const target = LEGACY_UNIDENTIFIED[0];
      const prd = read(root, REL_PRD).replace(`- [x] ${target}`, `- [ ] ${target}`);
      if (prd === read(root, REL_PRD)) throw new Error("legacy line not found verbatim in the PRD");
      write(root, REL_PRD, prd);
    },
    expect: "UNIDENTIFIED CRITERION",
  },
  {
    name: "a brand-new criterion is added with no id, no manifest row and no owner",
    mutate: (root) => {
      const lines = read(root, REL_PRD).split("\n");
      const at = lines.findIndex((l) => /^- \[[ x]\] /.test(l));
      lines.splice(at + 1, 0, "- [ ] Ship the payroll bank-batch natural key before cutover.");
      write(root, REL_PRD, lines.join("\n"));
    },
    expect: "UNIDENTIFIED CRITERION",
  },
  {
    name: "an id-less criterion is deleted to make the list shorter",
    mutate: (root) => {
      const target = LEGACY_UNIDENTIFIED[0];
      write(
        root,
        REL_PRD,
        read(root, REL_PRD)
          .split("\n")
          .filter((l) => l.trim() !== `- [x] ${target}`)
          .join("\n"),
      );
    },
    expect: "LEGACY CRITERION DELETED",
  },
  {
    name: "the manifest headline no longer matches the rows it describes",
    mutate: (root) => {
      write(
        root,
        REL_MANIFEST,
        read(root, REL_MANIFEST).replace(
          /^Exactly \*\*\d+\*\* unchecked PRD criteria/m,
          "Exactly **250** unchecked PRD criteria",
        ),
      );
    },
    expect: "MANIFEST HEADLINE DRIFT",
  },
  {
    name: "the vacuity floor sits below the corpus the manifest declares",
    mutate: (root) => {
      // Same edge as lowering MIN_CRITERIA, reached from the manifest side: the floor is pinned to
      // this sentence, so the two can never drift apart silently again.
      write(
        root,
        REL_MANIFEST,
        read(root, REL_MANIFEST).replace(
          /^Exactly \*\*(\d+)\*\* unchecked PRD criteria are assigned to \*\*(\d+)\*\* execution tickets/m,
          (_line, _n, m) => `Exactly **250** unchecked PRD criteria are assigned to **${m}** execution tickets`,
        ),
      );
    },
    expect: "VACUITY FLOOR LOWERED",
  },
  {
    name: "the manifest headline is deleted, unpinning both floors",
    mutate: (root) => {
      write(
        root,
        REL_MANIFEST,
        read(root, REL_MANIFEST)
          .split("\n")
          .filter((l) => !/^Exactly \*\*\d+\*\* unchecked PRD criteria/.test(l))
          .join("\n"),
      );
    },
    expect: "MANIFEST HEADLINE MISSING",
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

// --- Anti-vacuity: the generated cases must be generated from a corpus that has not shrunk --------
// Without this, deleting nine of the ten restored ids would silently delete nine cases and the run
// would still end "PASS". The counts are the same numbers the gate's own comments state.
if (RESTORED_IDS.length !== EXPECTED_RESTORED) {
  problems.push(
    `RESTORED_MODULE_EVIDENCE holds ${RESTORED_IDS.length} ids, expected ${EXPECTED_RESTORED}. ` +
      `Ten module-evidence criteria were restored because 60 carried "Proven" boxes had rested on ` +
      `deleted text; the map may not shrink. If the corpus genuinely changed, change ` +
      `EXPECTED_RESTORED in the same commit and say why.`,
  );
  console.log(`  FAIL  restored-evidence pin count — ${RESTORED_IDS.length}, expected ${EXPECTED_RESTORED}`);
} else {
  passed += 1;
  console.log(`  PASS  restored-evidence pin count — ${EXPECTED_RESTORED} ids, one case each`);
}
if (LEGACY_UNIDENTIFIED.length !== EXPECTED_LEGACY) {
  problems.push(
    `LEGACY_UNIDENTIFIED holds ${LEGACY_UNIDENTIFIED.length} lines, expected ${EXPECTED_LEGACY}. ` +
      `That list is the frozen measurement of the PRD's id-less checkbox lines; it may shrink only ` +
      `by giving a line an id and an owner, and may never grow.`,
  );
  console.log(`  FAIL  legacy id-less pin count — ${LEGACY_UNIDENTIFIED.length}, expected ${EXPECTED_LEGACY}`);
} else {
  passed += 1;
  console.log(`  PASS  legacy id-less pin count — ${EXPECTED_LEGACY} lines frozen`);
}
const TOTAL_CASES = cases.length + 2;

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

console.log(`\ncheck-prd-traceability self-test: ${passed}/${TOTAL_CASES} cases`);
if (problems.length > 0) {
  console.error("\nFAIL:\n" + problems.map((p) => `  ${p}`).join("\n\n"));
  process.exit(1);
}
console.log("PASS — the gate bites on every defect class it claims to cover.");
