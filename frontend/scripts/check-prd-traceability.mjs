#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.PRD_TRACEABILITY_ROOT ? resolve(process.env.PRD_TRACEABILITY_ROOT) : resolve(HERE, "..", "..");
const PRD_DIR = join(ROOT, "architecture-refactor", "prd");
const PLAN_NAME = "completion-plan.md";
const CRITERIA = join(ROOT, "architecture-refactor", "PRD-10-10-CODE-RELEASE-TODO.md");

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

export function validateBacklog({ planText, prdFiles, legacyText, minTasks = 10 }) {
  const failures = [];
  const lines = visibleLines(planText);
  const known = new Set(visibleLines(legacyText).join("\n").match(/\bPRD-C\d{3}\b/g) ?? []);
  if (!known.size) failures.push("EMPTY REGISTRY: no known PRD criteria.");
  if (!prdFiles.includes(PLAN_NAME)) failures.push("MISSING PLAN: completion-plan.md must exist.");
  for (const file of prdFiles) if (/\.md$/i.test(file) && file !== PLAN_NAME) failures.push("COMPETING PRD: " + file);
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

function main() {
  const plan = join(PRD_DIR, PLAN_NAME);
  if (!existsSync(plan) || !existsSync(CRITERIA)) {
    console.error("FAIL: completion-plan.md or criterion registry is missing.");
    process.exit(1);
  }
  const prdFiles = readdirSync(PRD_DIR, { withFileTypes: true }).filter(entry => entry.isFile() || entry.isSymbolicLink()).map(entry => entry.name);
  const result = validateBacklog({ planText: readFileSync(plan, "utf8"), prdFiles, legacyText: readFileSync(CRITERIA, "utf8") });
  if (result.failures.length) {
    for (const failure of result.failures) console.error("FAIL: " + failure);
    process.exit(1);
  }
  console.log("PASS: " + result.taskCount + " acceptance checkboxes across " + result.sectionCount + " owned, criterion-mapped sections. Traceability is not completion evidence.");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
