#!/usr/bin/env node
/**
 * v2 ticket 01 / PRD-C017 — the traceability manifest, enforced.
 *
 * Every unchecked PRD criterion must have one stable identifier and exactly one owning execution
 * ticket. This gate makes that fail closed, because the previous ticket set proved it does not hold
 * on its own: it left five PRD boxes without an owner, four ticket boxes with no PRD counterpart,
 * and three partial boxes with no representation at all. None of those were noticed while the
 * mapping lived only in prose.
 *
 * The other half of PRD-C017 is "the restored module evidence cannot disappear again". Ten
 * module-evidence criteria — Home, Directory/Me, HRMS, Build/PM, Workflows, Billing/Payments,
 * Accounting/Finance, Chat, Notifications and shared adapters — were previously carried as 60
 * "Proven" boxes that rested entirely on deleted text. They were restored. The PRD's own header
 * says completed items get REMOVED from the file, so the mechanism that deleted them once is still
 * in place. RESTORED_MODULE_EVIDENCE below pins them by id: a checked box must be recorded `[x]`
 * and stay in the file, never be deleted to make the list shorter.
 *
 * WHAT THIS GATE REFUSES TO DO: it does not read the ticket bodies for quality, and it cannot tell
 * you whether a `[x]` is true. It tests that the mapping is total, injective, and that the two
 * sides say the same words and carry the same state. A criterion can be perfectly traceable and
 * still be a lie; that is what the other gates and the reports are for.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative } from "node:path";
// The two pinned corpora live in their own module so the self-test can import them without
// executing this gate. See check-prd-traceability-pins.mjs for why that matters.
import {
  LEGACY_UNIDENTIFIED,
  RESTORED_MODULE_EVIDENCE,
} from "./check-prd-traceability-pins.mjs";

// PRD-C015: resolve from the script's own location, never an absolute workstation path, so this
// runs identically on Windows, macOS and Linux and from any working directory.
const HERE = dirname(fileURLToPath(import.meta.url));
// PRD_TRACEABILITY_ROOT exists so the self-test can point this gate at a mutated fixture tree.
// It is never set in normal operation, and the default is derived from the script's own location.
const FRONTEND_REPO = process.env.PRD_TRACEABILITY_ROOT
  ? resolve(process.env.PRD_TRACEABILITY_ROOT)
  : resolve(HERE, "..", "..");
const PRD_PATH = join(FRONTEND_REPO, "architecture-refactor", "PRD-10-10-CODE-RELEASE-TODO.md");
const V2_DIR = join(FRONTEND_REPO, ".scratch", "code-release-10-10-v2");
const MANIFEST_PATH = join(V2_DIR, "TRACEABILITY.md");
const ISSUES_DIR = join(V2_DIR, "issues");

// --- Vacuity floors -------------------------------------------------------------------------
// A gate that scans nothing passes everything. These are the counts this release was reconciled
// against; a scan that finds fewer has lost sight of the corpus rather than found it clean.
const MIN_CRITERIA = 195;
const MIN_TICKETS = 36;

const PRD_LINE = /^\s*- \[([ x])\] \*\*\[(PRD-C\d{3})\]\*\* (.+?)\s*$/;
const CHECKBOX_LINE = /^\s*- \[([ x])\] (.+?)\s*$/;
const TICKET_LINE = /^\s*- \[([ x])\] \*\*(PRD-C\d{3})\*\* — (.+?)\s*$/;
const MANIFEST_ROW = /^\| (PRD-C\d{3}) \| (\d+) \| (.+?) \|\s*$/;
const COVERAGE_ROW = /^- Ticket (\d{2}): (\d+)\s*$/;
/** The manifest's own headline. Pins the vacuity floors to a number a reviewer reads. */
const MANIFEST_HEADLINE =
  /^Exactly \*\*(\d+)\*\* unchecked PRD criteria are assigned to \*\*(\d+)\*\* execution tickets/m;

/** Whitespace-insensitive, so a re-wrap is not a false failure. */
const normalizeLine = (s) => s.replace(/\s+/g, " ").trim();
const LEGACY_UNIDENTIFIED_SET = new Set(LEGACY_UNIDENTIFIED.map(normalizeLine));

const failures = [];
const fail = (msg) => failures.push(msg);

function readOrDie(path, label) {
  if (!existsSync(path)) {
    console.error(`FAIL: ${label} not found at ${path}`);
    console.error("This gate cannot report a clean mapping over a file it could not read.");
    process.exit(1);
  }
  return readFileSync(path, "utf8");
}

// --- 1. Parse the PRD -------------------------------------------------------------------------
const prdText = readOrDie(PRD_PATH, "PRD");
/** @type {Map<string, {checked: boolean, text: string, line: number}>} */
const prd = new Map();
prdText.split("\n").forEach((line, i) => {
  const m = PRD_LINE.exec(line);
  if (!m) return;
  const [, box, id, text] = m;
  if (prd.has(id)) {
    fail(`DUPLICATE PRD criterion ${id} — declared at PRD line ${prd.get(id).line} and again at ${i + 1}. An id must name one criterion.`);
    return;
  }
  prd.set(id, { checked: box === "x", text, line: i + 1 });
});

// A stray `PRD-Cnnn` that is not a criterion line is either a typo or a criterion someone
// half-deleted. Either way the file no longer means what it appears to mean.
prdText.split("\n").forEach((line, i) => {
  if (!/PRD-C\d{3}/.test(line)) return;
  if (PRD_LINE.test(line)) return;
  for (const id of line.match(/PRD-C\d{3}/g) ?? []) {
    if (!prd.has(id)) {
      fail(`ORPHAN reference to ${id} at PRD line ${i + 1} — the id is mentioned but no criterion line declares it.`);
    }
  }
});

// --- 1b. Every checkbox line is a criterion, and every criterion carries an id -------------------
// The two passes above only ever see lines that already have an id, so a checkbox line without one
// could be unchecked, unowned and invisible. This pass closes that. The 37 legacy lines are frozen
// by content: they may be ticked, never un-ticked, never deleted, never grown.
const seenLegacy = new Set();
prdText.split("\n").forEach((line, i) => {
  const m = CHECKBOX_LINE.exec(line);
  if (!m) return;
  if (PRD_LINE.test(line)) return;
  const [, box, text] = m;
  const key = normalizeLine(text);
  const known = LEGACY_UNIDENTIFIED_SET.has(key);
  if (known) seenLegacy.add(key);
  if (known && box === "x") return;
  if (known) {
    fail(
      `UNIDENTIFIED CRITERION un-ticked at PRD line ${i + 1} — "${key.slice(0, 90)}". ` +
        `A criterion with no \`**[PRD-Cnnn]**\` id has no manifest row and no owning ticket, so once ` +
        `it is unchecked nothing in this release is accountable for it. Give it an id and an owner, ` +
        `or leave it \`[x]\`.`,
    );
    return;
  }
  fail(
    `UNIDENTIFIED CRITERION at PRD line ${i + 1} — "${key.slice(0, 90)}". ` +
      `Every new criterion must carry a \`**[PRD-Cnnn]**\` id, a manifest row and an owning ticket; ` +
      `without one it is invisible to this gate and to the manifest.`,
  );
});
for (const key of LEGACY_UNIDENTIFIED_SET) {
  if (!seenLegacy.has(key)) {
    fail(
      `LEGACY CRITERION DELETED — "${key.slice(0, 90)}" is in LEGACY_UNIDENTIFIED but no longer in ` +
        `the PRD. A completed criterion is recorded \`[x]\`; it is never deleted. If it genuinely ` +
        `belongs somewhere else now, give it an id and an owner in the same commit.`,
    );
  }
}

// --- 2. Parse the manifest --------------------------------------------------------------------
const manifestText = readOrDie(MANIFEST_PATH, "traceability manifest");
/** @type {Map<string, {ticket: string, section: string, line: number}>} */
const manifest = new Map();
/** @type {Map<string, number>} */
const declaredCoverage = new Map();
manifestText.split("\n").forEach((line, i) => {
  const row = MANIFEST_ROW.exec(line);
  if (row) {
    const [, id, ticket, section] = row;
    if (manifest.has(id)) {
      fail(`DUPLICATE OWNER: ${id} is assigned twice in the manifest (lines ${manifest.get(id).line} and ${i + 1}). "Exactly one owner" is the whole point of the manifest.`);
      return;
    }
    manifest.set(id, { ticket, section, line: i + 1 });
    return;
  }
  const cov = COVERAGE_ROW.exec(line);
  if (cov) declaredCoverage.set(cov[1], Number(cov[2]));
});

// --- 3. Parse the tickets ---------------------------------------------------------------------
const ticketFiles = readdirSync(ISSUES_DIR).filter((f) => /^\d{2}-.+\.md$/.test(f)).sort();
/** @type {Map<string, {ticket: string, checked: boolean, text: string, file: string, line: number}>} */
const ticketCriteria = new Map();
/** @type {Map<string, number>} */
const actualCoverage = new Map();

for (const file of ticketFiles) {
  const ticket = file.slice(0, 2);
  actualCoverage.set(ticket, 0);
  const body = readFileSync(join(ISSUES_DIR, file), "utf8");
  body.split("\n").forEach((line, i) => {
    const m = TICKET_LINE.exec(line);
    if (!m) return;
    const [, box, id, text] = m;
    if (ticketCriteria.has(id)) {
      const prev = ticketCriteria.get(id);
      fail(`DUPLICATE OWNER: ${id} is claimed by ticket ${prev.ticket} (${prev.file}:${prev.line}) and ticket ${ticket} (${file}:${i + 1}).`);
      return;
    }
    ticketCriteria.set(id, { ticket, checked: box === "x", text, file, line: i + 1 });
    actualCoverage.set(ticket, actualCoverage.get(ticket) + 1);
  });
}

// --- 4. Vacuity floors ------------------------------------------------------------------------
if (prd.size < MIN_CRITERIA) {
  fail(`VACUITY FLOOR: parsed ${prd.size} PRD criteria, floor is ${MIN_CRITERIA}. A criterion that is completed is recorded \`[x]\`; it is never deleted. If the corpus genuinely shrank, lower the floor in the same commit and say why.`);
}
if (ticketFiles.length < MIN_TICKETS) {
  fail(`VACUITY FLOOR: found ${ticketFiles.length} ticket files, floor is ${MIN_TICKETS}.`);
}

// The floors above are constants inside the file they defend, and nothing outside pinned either —
// so one commit could lower MIN_CRITERIA by one, delete a criterion everywhere, and this gate would
// print PASS over the smaller corpus. MEASURED: lowering 195 -> 194 and deleting PRD-C115 from the
// PRD, the manifest, ticket 06 and RESTORED_MODULE_EVIDENCE gave exit 0 with "PASS — every
// criterion has exactly one owner" and PRD-C115 occurrences 0/0/0.
//
// The manifest's own headline states the same two numbers in prose a reviewer reads. Tying the
// floors to it means lowering a floor now requires editing that sentence in the same commit, and
// the manifest can no longer describe a corpus it does not have.
const headline = MANIFEST_HEADLINE.exec(manifestText);
if (!headline) {
  fail(
    `MANIFEST HEADLINE MISSING: ${relative(FRONTEND_REPO, MANIFEST_PATH)} no longer states ` +
      `"Exactly **N** unchecked PRD criteria are assigned to **M** execution tickets". That sentence ` +
      `is what pins MIN_CRITERIA and MIN_TICKETS to something outside this script.`,
  );
} else {
  const declaredCriteria = Number(headline[1]);
  const declaredTickets = Number(headline[2]);
  if (manifest.size !== declaredCriteria) {
    fail(
      `MANIFEST HEADLINE DRIFT: the manifest says it assigns ${declaredCriteria} criteria, but it ` +
        `carries ${manifest.size} rows. Update the headline in the same commit as the rows.`,
    );
  }
  if (ticketFiles.length !== declaredTickets) {
    fail(
      `MANIFEST HEADLINE DRIFT: the manifest says ${declaredTickets} execution tickets, but ` +
        `issues/ holds ${ticketFiles.length}.`,
    );
  }
  if (MIN_CRITERIA < declaredCriteria) {
    fail(
      `VACUITY FLOOR LOWERED: MIN_CRITERIA is ${MIN_CRITERIA} but the manifest headline declares ` +
        `${declaredCriteria} criteria. A floor below the declared corpus disarms the floor.`,
    );
  }
  if (MIN_TICKETS < declaredTickets) {
    fail(
      `VACUITY FLOOR LOWERED: MIN_TICKETS is ${MIN_TICKETS} but the manifest headline declares ` +
        `${declaredTickets} execution tickets.`,
    );
  }
}

// --- 5. The mapping must be total and injective ------------------------------------------------
for (const [id, c] of prd) {
  if (!manifest.has(id)) {
    fail(`UNOWNED: ${id} is a PRD criterion (line ${c.line}) with no row in the manifest. Every criterion needs exactly one owner.`);
  }
  if (!ticketCriteria.has(id)) {
    fail(`UNOWNED: ${id} is a PRD criterion (line ${c.line}) that no ticket file carries.`);
  }
}

// PRD-C017 names this case explicitly: "ticket-only criteria are rejected".
for (const [id, t] of ticketCriteria) {
  if (!prd.has(id)) {
    fail(`TICKET-ONLY: ${id} is claimed by ticket ${t.ticket} (${t.file}:${t.line}) but is not a criterion in the PRD. Acceptance work must trace to the source, or it is scope nobody agreed to.`);
  }
}
for (const [id, m] of manifest) {
  if (!prd.has(id)) {
    fail(`MANIFEST-ONLY: ${id} has a manifest row (line ${m.line}) but is not a criterion in the PRD.`);
  }
}

// --- 6. Manifest and ticket files must agree on the owner ---------------------------------------
for (const [id, m] of manifest) {
  const t = ticketCriteria.get(id);
  if (!t) {
    fail(`MANIFEST ASSIGNS AN ABSENT CRITERION: the manifest gives ${id} to ticket ${m.ticket}, but no ticket file lists it. The assignment is not real.`);
    continue;
  }
  if (t.ticket !== m.ticket) {
    fail(`OWNER DISAGREEMENT: the manifest assigns ${id} to ticket ${m.ticket}, but it is listed in ticket ${t.ticket} (${t.file}:${t.line}).`);
  }
}

// --- 7. Text must be verbatim -------------------------------------------------------------------
// "Ticket criteria quote the source criterion verbatim" — a ticket that paraphrases can narrow the
// criterion without anyone editing the PRD.
const normalize = (s) => s.replace(/\s+/g, " ").trim();
for (const [id, t] of ticketCriteria) {
  const c = prd.get(id);
  if (!c) continue;
  if (normalize(c.text) !== normalize(t.text)) {
    fail(
      `TEXT DRIFT: ${id} does not quote the PRD verbatim.\n` +
        `    PRD    (line ${c.line}): ${c.text}\n` +
        `    ticket (${t.file}:${t.line}): ${t.text}`,
    );
  }
}

// --- 8. Checkbox state must move together --------------------------------------------------------
// "Source and ticket checkbox states change together." A ticket ticked ahead of its PRD box is how
// a release reports completion the source never recorded.
for (const [id, t] of ticketCriteria) {
  const c = prd.get(id);
  if (!c) continue;
  if (c.checked !== t.checked) {
    fail(
      `STATE DIVERGENCE: ${id} is [${c.checked ? "x" : " "}] in the PRD (line ${c.line}) but ` +
        `[${t.checked ? "x" : " "}] in ticket ${t.ticket} (${t.file}:${t.line}). Flip both in the same commit.`,
    );
  }
}

// --- 9. PRD-C017: the restored module evidence cannot disappear ------------------------------------
for (const [id, moduleName] of Object.entries(RESTORED_MODULE_EVIDENCE)) {
  if (!prd.has(id)) {
    fail(
      `RESTORED EVIDENCE DELETED: ${id} (${moduleName}) is gone from the PRD. These ten criteria were ` +
        `restored precisely because 60 carried "Proven" boxes had rested on deleted text. Record it \`[x]\`; do not remove it.`,
    );
  }
  if (!ticketCriteria.has(id)) {
    fail(`RESTORED EVIDENCE UNOWNED: ${id} (${moduleName}) is carried by no ticket.`);
  }
}

// --- 10. Declared coverage totals must match reality ------------------------------------------------
for (const [ticket, declared] of declaredCoverage) {
  const actual = actualCoverage.get(ticket);
  if (actual === undefined) {
    fail(`COVERAGE ROW FOR A MISSING TICKET: the manifest declares Ticket ${ticket}, but there is no ${ticket}-*.md in issues/.`);
    continue;
  }
  if (actual !== declared) {
    fail(`COVERAGE MISMATCH: the manifest declares Ticket ${ticket}: ${declared}, but that ticket file lists ${actual} criteria.`);
  }
}
for (const ticket of actualCoverage.keys()) {
  if (!declaredCoverage.has(ticket)) {
    fail(`COVERAGE ROW MISSING: ticket ${ticket} exists in issues/ but has no total in the manifest's coverage list.`);
  }
}

// --- Report ------------------------------------------------------------------------------------------
const checked = [...prd.values()].filter((c) => c.checked).length;
console.log(`=== PRD traceability — ${prd.size} criteria, ${ticketFiles.length} tickets ===`);
console.log(`  manifest rows      ${manifest.size}`);
console.log(`  ticket criteria    ${ticketCriteria.size}`);
console.log(`  checked            ${checked}`);
console.log(`  unchecked          ${prd.size - checked}`);
console.log(`  PRD                ${relative(FRONTEND_REPO, PRD_PATH)}`);
console.log(`  manifest           ${relative(FRONTEND_REPO, MANIFEST_PATH)}`);

if (failures.length > 0) {
  console.error(`\nFAIL — ${failures.length} traceability defect(s):\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("\nPASS — every criterion has exactly one owner, quoted verbatim, with matching state.");
