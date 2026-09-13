#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.PRD_TRACEABILITY_ROOT ? resolve(process.env.PRD_TRACEABILITY_ROOT) : resolve(HERE, "..", "..");
const ARCHITECTURE_DIR = join(ROOT, "architecture-refactor");
const PLAN_NAME = "prd/completion-plan.md";
// These are consumed by evidence seals or the S7 collector, not execution plans.
// Exact paths only: adding a new report requires review, not a directory exemption.
export const REQUIRED_EVIDENCE_MD = new Set([
  "final-refactor/evidence/40-observability/FAILURE-RUNBOOKS.md",
  "final-refactor/evidence/42-production-ops/OPS-CATALOGUE-INVENTORY.md",
  "final-refactor/evidence/42-production-ops/data-catalogue-c183/README.md",
  "final-refactor/evidence/42-production-ops/RB-10-privacy-compliance/C187-downstream-store-trace.md",
  "final-refactor/evidence/42-production-ops/RB-10-privacy-compliance/FINDINGS.md",
  "final-refactor/evidence/42-production-ops/RB-10-privacy-compliance/README.md",
  "final-refactor/evidence/s02-bootstrap-parity.md",
  "final-refactor/evidence/s02-tenant-integrity.md",
  "final-refactor/evidence/bootstrap-head-637/README.md",
  "final-refactor/evidence/bootstrap-head-685/README.md",
  "final-refactor/evidence/SUPERSEDED-FORMER-HEAD.md",
  "final-refactor/evidence/REDACTION-AND-RESEAL-LEDGER.md",
  "final-refactor/evidence/perf-budget-manifest.md",
  "final-refactor/evidence/42-production-ops/RB-06-live-alert-delivery/README.md",
  "final-refactor/evidence/42-production-ops/RB-06-live-alert-delivery/operator-attestation-UNSIGNED.md",
  "final-refactor/evidence/45-scale/S7-LIVE-DEV-EVIDENCE.md",
  "final-refactor/evidence/s3-communications/fd1-fd3-fd6-measurement-2026-09-13.md",
  "final-refactor/evidence/42-production-ops/release-authority/BUILD-002-2026-09-13/acceptance-table.md",
]);

// Markdown examples and comments cannot manufacture traceability.
function visibleLines(source) {
  let fence;
  return source.replace(/<!--[\s\S]*?(?:-->|$)/g, comment => comment.replace(/[^\n]/g, " "))
    .split(/\r?\n/).map(line => {
      const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
        return "";
      }
      if (marker) { fence = marker[1]; return ""; }
      return line;
    });
}

export function validateBacklog({ planText, prdFiles, minTasks = 10 }) {
  const failures = [];
  const lines = visibleLines(planText);
  const known = new Set();
  let inRegistry = false;
  let registryCount = 0;
  for (const line of lines) {
    const heading = /^ {0,3}#\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      inRegistry = heading[1] === "Criterion registry";
      if (inRegistry && ++registryCount > 1) failures.push("DUPLICATE REGISTRY: keep one criterion registry.");
      continue;
    }
    if (!inRegistry) continue;
    const row = /^- \*\*(PRD-C\d{3})\*\* — (\S.*)$/.exec(line);
    if (!row) {
      if (/\bPRD-C\d/.test(line)) failures.push("MALFORMED CRITERION: " + line);
      continue;
    }
    if (known.has(row[1])) failures.push("DUPLICATE CRITERION: " + row[1]);
    known.add(row[1]);
  }
  if (!known.size) failures.push("EMPTY REGISTRY: no known PRD criteria.");
  if (!prdFiles.includes(PLAN_NAME)) failures.push("MISSING PLAN: completion-plan.md must exist.");
  for (const file of prdFiles)
    if (/\.md$/i.test(file) && file !== PLAN_NAME && !REQUIRED_EVIDENCE_MD.has(file))
      failures.push("COMPETING PRD: " + file);
  if (!lines.some(line => /the only execution checklist/i.test(line) && !/^\s*(?:>|[-+*] |\d+[.)] )/.test(line))) failures.push("PLAN AUTHORITY: declare 'The only execution checklist'.");
  const sections = [];
  const tasks = [];
  const identities = new Set();
  let section;
  let context = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = /^ {0,3}#\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const match = /^(S[0-5](?:\/S[0-5])*)\s+—\s+(.+)$/.exec(heading[1]);
      section = match ? { title: heading[1], owners: match[1], metadata: {}, preamble: true, tasks: 0 } : undefined;
      if (section) {
        if (sections.some(prior => prior.title === section.title)) failures.push("DUPLICATE SECTION: " + section.title);
        sections.push(section);
      }
      context = "";
      continue;
    }
    const subheading = /^ {0,3}#{2,6}\s+(.+)$/.exec(line);
    if (subheading) { context = subheading[1]; if (section) section.preamble = false; }
    const checkbox = /^\s*(?:[-+*]|\d+[.)])\s+\[([ xX])\](?:\s+(.*))?$/.exec(line);
    if (checkbox) {
      if (!section) { failures.push("ORPHAN TASK: line " + (i + 1)); continue; }
      section.preamble = false;
      const name = (checkbox[2] ?? "").replace(/[*_`]/g, "").trim();
      if (name.length < 10 || /^(?:todo|tbd|pending|task|done)[.!]?$/i.test(name)) { failures.push("UNNAMED TASK: line " + (i + 1)); continue; }
      // Heading plus checkbox text identifies named tasks and their residual subtasks.
      const identity = section.title + "::" + context + "::" + name;
      if (identities.has(identity)) { failures.push("DUPLICATE TASK: line " + (i + 1)); continue; }
      identities.add(identity);
      section.tasks++;
      tasks.push({ section: section.title, context, name, line: i + 1, completed: checkbox[1] !== " " });
    }
    if (section?.preamble) {
      const field = /^(Owner|Maps to):\s*(.*)$/.exec(line);
      if (field) {
        if (Object.hasOwn(section.metadata, field[1])) failures.push("DUPLICATE METADATA: " + section.title + ": " + field[1]);
        section.metadata[field[1]] = field[2].trim();
      }
    }
  }
  for (const entry of sections) {
    if (entry.metadata.Owner !== entry.owners) failures.push("BAD OWNER: " + entry.title + " requires Owner: " + entry.owners);
    const mapping = entry.metadata["Maps to"] ?? "";
    if (!/^PRD-C\d{3}(?:,\s*PRD-C\d{3})*$/.test(mapping)) failures.push("UNMAPPED SECTION: " + entry.title);
    for (const criterion of mapping.match(/\bPRD-C\d{3}\b/g) ?? []) if (!known.has(criterion)) failures.push("UNKNOWN CRITERION: " + criterion);
    if (!entry.tasks) failures.push("EMPTY SECTION: " + entry.title);
  }
  if (!Number.isInteger(minTasks) || minTasks < 1) failures.push("BAD MINIMUM: require at least one task.");
  if (tasks.length < minTasks) failures.push("VACUOUS BACKLOG: found " + tasks.length + "; expected at least " + minTasks);
  return { failures, taskCount: tasks.length, sectionCount: sections.length, tasks };
}

export function architectureFiles(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error("UNSUPPORTED SYMLINK: " + path);
    return entry.isDirectory() ? architectureFiles(join(directory, entry.name), path + "/") : [path];
  });
}

function main() {
  const plan = join(ARCHITECTURE_DIR, PLAN_NAME);
  if (!existsSync(plan)) {
    console.error("FAIL: completion-plan.md is missing.");
    process.exit(1);
  }
  const result = validateBacklog({ planText: readFileSync(plan, "utf8"), prdFiles: architectureFiles(ARCHITECTURE_DIR) });
  if (result.failures.length) {
    for (const failure of result.failures) console.error("FAIL: " + failure);
    process.exit(1);
  }
  console.log("PASS: " + result.taskCount + " acceptance checkboxes across " + result.sectionCount + " owned, criterion-mapped sections. Traceability is not completion evidence.");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
