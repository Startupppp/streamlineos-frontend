import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve("docs/build-module");
const indexPath = join(root, "implementation", "TODO-INDEX.md");
const researchPrefixes = [
  "streamlineos-analysis-pack/",
  "streamlineos-pm-pack/",
  "streamlineos-ux/",
];
const informationalHeadings = new Set([
  "purpose",
  "truth labels",
  "research inputs",
  "how to read this document",
  "how to use this document",
  "document map",
  "contents",
  "sources",
  "source notes",
  "folder maintenance",
  "delivery checklist",
]);

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

function tasksFor(source) {
  const headings = [...source.matchAll(/^##\s+(.+?)\s*$/gm)]
    .map((match) => match[1].replaceAll("`", ""))
    .filter((heading) => !informationalHeadings.has(heading.toLowerCase()));
  const unique = [...new Set(headings)];
  return [
    "- [ ] Reconcile this document against the current implementation and its requirement IDs.",
    ...unique.map(
      (heading) =>
        `- [ ] ${heading}: implement the accepted behavior and record focused verification.`,
    ),
    "- [ ] Capture applicable browser, role/tenant, persistence, and operations evidence before closing this document.",
  ];
}

function appendChecklist(path) {
  const source = readFileSync(path, "utf8");
  if (/^## Delivery checklist\s*$/m.test(source)) return;
  const ledger = normalized(relative(resolve(path, ".."), join(root, "implementation", "REQUIREMENT-LEDGER.md")));
  const claims = normalized(relative(resolve(path, ".."), join(root, "implementation", "WORK-CLAIMS.md")));
  const section = [
    "## Delivery checklist",
    "",
    `Track completion in the [requirement ledger](${ledger}) and [work claims](${claims}). An unchecked item stays open until evidence is recorded on the current branch.`,
    "",
    ...tasksFor(source),
    "",
  ].join("\n");
  writeFileSync(path, `${source.trimEnd()}\n\n${section}`, "utf8");
}

function indexText(files) {
  const canonical = files.filter((path) => !isResearch(path) && path !== indexPath);
  const research = files.filter(isResearch);
  const lines = [
    "# Build documentation TODO index",
    "",
    "The checklist inside each current specification is the source of truth for its implementation status. A checked research row below means only that the historical file is inventoried; it does not verify any product behavior. Check a specification item only after recording the current revision and required evidence in the requirement ledger and work claims.",
    "",
    "## Delivery checklist",
    "",
    "- [ ] Every actionable specification below is closed with current source, focused checks, and applicable runtime evidence.",
    "- [ ] Every accepted research finding has an adopted or deferred destination in the research traceability map.",
    "- [ ] Release gates, tenant/role browser paths, persistence, and operations evidence are complete.",
    "",
    `## Current specifications (${canonical.length})`,
    "",
  ];
  for (const path of canonical) {
    const source = readFileSync(path, "utf8");
    const open = [...source.matchAll(/^- \[ \]/gm)].length;
    const relativePath = normalized(relative(join(root, "implementation"), path));
    const label = normalized(relative(root, path));
    lines.push(`- [${open === 0 ? "x" : " "}] [${label}](${relativePath}) — ${open} open item${open === 1 ? "" : "s"}`);
  }
  lines.push("", `## Historical research and evidence (${research.length})`, "");
  for (const path of research) {
    const relativePath = normalized(relative(join(root, "implementation"), path));
    const label = normalized(relative(root, path));
    lines.push(`- [x] [${label}](${relativePath}) — inventoried reference; implementation is tracked in current specifications`);
  }
  lines.push("");
  return lines.join("\n");
}

const mode = process.argv[2] ?? "--check";
if (mode !== "--apply" && mode !== "--check")
  throw new Error("Use --apply or --check");
const files = markdownFiles(root);
const canonical = files.filter((path) => !isResearch(path) && path !== indexPath);
if (mode === "--apply") {
  for (const path of canonical) appendChecklist(path);
  const currentFiles = markdownFiles(root);
  writeFileSync(indexPath, indexText(currentFiles), "utf8");
  process.stdout.write(`Updated ${canonical.length} current specifications and indexed ${currentFiles.length} Markdown files.\n`);
} else {
  const missing = canonical.filter(
    (path) => !/^## Delivery checklist\s*$/m.test(readFileSync(path, "utf8")),
  );
  const expected = indexText(files);
  const actual = readFileSync(indexPath, "utf8");
  if (missing.length > 0 || actual !== expected) {
    process.stderr.write(`Build documentation TODO index is stale: ${missing.length} specifications lack checklists. Run --apply.\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Build documentation TODO index is current: ${canonical.length} specifications, ${files.length - canonical.length - 1} research files.\n`);
  }
}
