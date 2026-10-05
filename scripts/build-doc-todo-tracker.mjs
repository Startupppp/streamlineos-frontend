import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve, sep } from "node:path";

const root = resolve("docs/build-module");
const indexPath = join(root, "implementation", "TODO-INDEX.md");
const traceabilityPath = join(root, "audit", "research-traceability.md");
const researchPrefixes = [
  "streamlineos-analysis-pack/",
  "streamlineos-pm-pack/",
  "streamlineos-ux/",
];
function normalized(value) {
  return value.split(sep).join("/");
}

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return markdownFiles(path);
      return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
    })
    .sort((left, right) => left.localeCompare(right));
}

function isResearch(path) {
  const name = normalized(relative(root, path));
  return researchPrefixes.some((prefix) => name.startsWith(prefix));
}

function researchTraceability(files) {
  const traceability = readFileSync(traceabilityPath, "utf8");
  return files.filter(isResearch).map((path) => ({
    path,
    mapped: traceability.includes(
      `](${normalized(relative(join(root, "audit"), path))})`,
    ),
  }));
}

const stages = ["D", "I", "T", "R", "B", "L"];

function recordedStages() {
  const current = readFileSync(indexPath, "utf8");
  const records = new Map();
  for (const line of current.split(/\r?\n/)) {
    if (!/^\| BT-[a-f0-9]{12} \|/.test(line)) continue;
    const cells = line.slice(2, -2).split(" | ");
    if (cells.length !== 11) throw new Error(`Malformed task row: ${line}`);
    const [id, , , ...rest] = cells;
    if (records.has(id)) throw new Error(`Duplicate task ID: ${id}`);
    const values = rest.slice(0, stages.length);
    const evidence = rest[stages.length];
    if (values.some((value) => !["?", "x", "-"].includes(value)))
      throw new Error(`Invalid stage state for ${id}`);
    if (values.includes("x") && !/\[[^\]]+\]\([^)]+\)/.test(evidence))
      throw new Error(`Task ${id} needs a proof link for every completed stage`);
    if (values.includes("-") && !evidence.includes("N/A:"))
      throw new Error(`Task ${id} needs an N/A rationale`);
    records.set(id, { values, evidence });
  }
  return records;
}

function taskRows(paths) {
  const seenIds = new Set();
  const rows = [];
  for (const path of paths) {
    const label = normalized(relative(root, path));
    const link = normalized(relative(join(root, "implementation"), path));
    const occurrences = new Map();
    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const match = /^- \[([ xX])\] (.*)$/.exec(line);
      if (!match) continue;
      const task = match[2].trim().replace(/\s+/g, " ");
      const occurrence = (occurrences.get(task) ?? 0) + 1;
      occurrences.set(task, occurrence);
      const id = `BT-${createHash("sha256").update(`${label}\n${task}\n${occurrence}`).digest("hex").slice(0, 12)}`;
      if (seenIds.has(id)) throw new Error(`Task ID collision: ${id}`);
      seenIds.add(id);
      const summary = task.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\|/g, "/");
      rows.push({ id, link, line: index + 1, checked: match[1].toLowerCase() === "x", summary });
    }
  }
  return rows;
}

function indexText(files) {
  const canonical = files.filter((path) => !isResearch(path) && path !== indexPath);
  const research = researchTraceability(files);
  const tasks = taskRows(canonical);
  const recorded = recordedStages();
  const currentIds = new Set(tasks.map(({ id }) => id));
  for (const [id, record] of recorded) {
    if (!currentIds.has(id) && (record.values.some((value) => value !== "?") || record.evidence !== "—"))
      throw new Error(`Recorded task ${id} no longer matches a source checkbox; reconcile its evidence before regenerating`);
  }
  const counts = canonical.map((path) => {
    const source = readFileSync(path, "utf8");
    return {
      path,
      open: [...source.matchAll(/^- \[ \]/gm)].length,
      checked: [...source.matchAll(/^- \[[xX]\]/gm)].length,
    };
  });
  const totalOpen = counts.reduce((sum, item) => sum + item.open, 0);
  const totalChecked = counts.reduce((sum, item) => sum + item.checked, 0);
  if (tasks.length !== totalOpen + totalChecked)
    throw new Error("The task register does not cover every specification checkbox");
  const lines = [
    "# Build documentation TODO index",
    "",
    `The Delivery checklist and any inline acceptance checkboxes inside each current specification are the source of truth for its implementation status. Open counts include every unchecked box in that document. A checked research row below means only that the historical source is linked in the research traceability map; it does not verify any product behavior. Check a specification item only after recording the current revision and required evidence in the requirement ledger and work claims. The ${canonical.length} current specifications plus this index make ${canonical.length + 1} canonical Markdown files.`,
    "",
    "## Delivery checklist",
    "",
    "- [ ] Every actionable specification below is closed with current source, focused checks, and applicable runtime evidence.",
    "- [ ] Every accepted research finding has an adopted or deferred destination in the research traceability map.",
    "- [ ] Release gates, tenant/role browser paths, persistence, and operations evidence are complete.",
    "",
    `Current specification items: ${totalChecked} checked; ${totalOpen} open. Historical research traceability: ${research.filter(({ mapped }) => mapped).length} mapped of ${research.length} files.`,
    "",
    `## Current specifications (${canonical.length})`,
    "",
  ];
  for (const { path, open, checked } of counts) {
    const relativePath = normalized(relative(join(root, "implementation"), path));
    const label = normalized(relative(root, path));
    lines.push(`- [${open === 0 ? "x" : " "}] [${label}](${relativePath}) — ${checked} checked, ${open} open`);
  }
  const staged = tasks.reduce((sum, { id }) => sum + (recorded.get(id)?.values.filter((value) => value === "x").length ?? 0), 0);
  lines.push(
    "",
    `## Item-level task register (${tasks.length})`,
    "",
    "Every row below maps to exactly one checkbox in a current specification. Its BT ID is stable while that checkbox text and file stay unchanged. The source checkbox is the final completion authority; these stages show partial progress without increasing the 522-item denominator. Historical checked items are not retroactively assigned stage evidence.",
    "",
    "Stages: D = decision and exclusive work claim; I = implementation and contracts; T = focused positive and negative checks; R = applicable database, authorization, cache, and event proof; B = applicable browser and mobile proof; L = applicable deployment and operations proof. `?` means unassessed/open, `x` means proven, and `-` means inapplicable with a reason. A stage marked `x` needs a proof link; `-` needs an `N/A:` rationale in Evidence. Stage evidence can advance while the source checkbox remains open. Complete that checkbox only when its own acceptance text and all applicable stages are satisfied.",
    "",
    "Before claiming a composite checkbox, list every clause as a numbered acceptance step under its BT ID in WORK-CLAIMS.md and map it to one existing primary package. A shared implementation can satisfy several BT IDs, but keep one file owner and cite the same proof instead of repeating work. Record exact file paths, dependencies, and evidence there; this register does not assign agents or files. Never mark a whole stage complete for partial clause coverage.",
    "",
    `Proven stages on open and checked items: ${staged}. Current specification items remain ${totalChecked} checked and ${totalOpen} open.`,
    "",
    "| ID | Source | State | D | I | T | R | B | L | Evidence | Task |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const task of tasks) {
    const record = recorded.get(task.id) ?? { values: stages.map(() => "?"), evidence: "—" };
    lines.push(`| ${task.id} | [source](${task.link}#L${task.line}) | ${task.checked ? "[x]" : "[ ]"} | ${record.values.join(" | ")} | ${record.evidence} | ${task.summary} |`);
  }
  lines.push("", `## Historical research and evidence (${research.length})`, "");
  for (const { path, mapped } of research) {
    const relativePath = normalized(relative(join(root, "implementation"), path));
    const label = normalized(relative(root, path));
    lines.push(`- [${mapped ? "x" : " "}] [${label}](${relativePath}) — ${mapped ? "mapped" : "unmapped"} historical reference; implementation is tracked in current specifications`);
  }
  lines.push("");
  return lines.join("\n");
}

const mode = process.argv[2] ?? "--check";
if (mode !== "--apply" && mode !== "--check")
  throw new Error("Use --apply or --check");
const files = markdownFiles(root);
const canonical = files.filter((path) => !isResearch(path) && path !== indexPath);
const missing = canonical.filter(
  (path) => !/^## Delivery checklist\s*$/m.test(readFileSync(path, "utf8")),
);
const unmapped = researchTraceability(files).filter(({ mapped }) => !mapped);
if (missing.length > 0 || unmapped.length > 0) {
  process.stderr.write(`${missing.length} current specifications lack Delivery checklists; ${unmapped.length} historical research files lack traceability links.\n`);
  for (const { path } of unmapped) process.stderr.write(`${normalized(relative(root, path))}\n`);
  process.exit(1);
}
if (mode === "--apply") {
  writeFileSync(indexPath, indexText(files), "utf8");
  process.stdout.write(`Refreshed index for ${canonical.length} current specifications and ${files.length} Markdown files.\n`);
} else {
  const expected = indexText(files);
  const actual = readFileSync(indexPath, "utf8");
  if (missing.length > 0 || actual !== expected) {
    process.stderr.write(`Build documentation TODO index is stale: ${missing.length} specifications lack checklists. Run --apply.\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Build documentation TODO index is current: ${canonical.length} specifications, ${files.length - canonical.length - 1} research files.\n`);
  }
}
