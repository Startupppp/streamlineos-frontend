import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SKIP_DIRS = new Set([".next", "node_modules", ".git"]);

const FIELD_TAGS = [
  "SelectTrigger",
  "TabsTrigger",
  "TabsList",
  "DatePicker",
];

const FIELD_CONSTANTS = new Set([
  "filterControlClassName",
  "FIELD_CLASS",
  "TRIGGER_CLASS",
  "INPUT_CLASS",
  "selectClass",
  "fieldClass",
]);

const HEIGHT_PATTERN = /\bh-(?:7|9|10)\b/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function shouldProcessLine(line) {
  if (FIELD_TAGS.some((tag) => line.includes(`<${tag}`))) return true;
  if (line.includes("<Input") && line.includes("className")) return true;
  for (const name of FIELD_CONSTANTS) {
    if (line.includes(name) && line.includes("=")) return true;
  }
  return false;
}

const MULTILINE_TAGS = [
  "Input",
  "DatePicker",
  "PhoneInput",
  "Textarea",
  "TabsTrigger",
  "TabsList",
  "SelectTrigger",
];

function migrateMultilineTag(content, tag) {
  let changed = false;
  const pattern = new RegExp(
    `<${tag}[\\s\\S]*?className="([^"]*)"`,
    "g",
  );
  const next = content.replace(pattern, (match, className) => {
    const updatedClassName = className.replace(HEIGHT_PATTERN, "h-8");
    if (updatedClassName === className) return match;
    changed = true;
    return match.replace(className, updatedClassName);
  });
  return { content: next, changed };
}

function migrateMultilineCn(content, tag) {
  let changed = false;
  const pattern = new RegExp(
    `<${tag}[\\s\\S]*?className=\\{cn\\(([^)]*)\\)\\}`,
    "g",
  );
  const next = content.replace(pattern, (match, cnArgs) => {
    const updatedArgs = cnArgs.replace(HEIGHT_PATTERN, "h-8");
    if (updatedArgs === cnArgs) return match;
    changed = true;
    return match.replace(cnArgs, updatedArgs);
  });
  return { content: next, changed };
}

function migrateContent(content) {
  let changed = false;
  let next = content;

  for (const tag of MULTILINE_TAGS) {
    const multiline = migrateMultilineTag(next, tag);
    next = multiline.content;
    changed = changed || multiline.changed;

    const multilineCn = migrateMultilineCn(next, tag);
    next = multilineCn.content;
    changed = changed || multilineCn.changed;
  }

  const lines = next.split("\n");
  const lineMigrated = lines.map((line) => {
    if (!shouldProcessLine(line)) return line;
    const updated = line.replace(HEIGHT_PATTERN, "h-8");
    if (updated !== line) changed = true;
    return updated;
  });

  return { content: lineMigrated.join("\n"), changed };
}

const files = walk(ROOT);
let touched = 0;
let replacements = 0;

for (const file of files) {
  if (file.includes("scripts/phase10-height-migration.mjs")) continue;
  const original = fs.readFileSync(file, "utf8");
  const beforeCount = (original.match(HEIGHT_PATTERN) ?? []).length;
  const { content, changed } = migrateContent(original);
  if (!changed) continue;
  const afterCount = (content.match(HEIGHT_PATTERN) ?? []).length;
  fs.writeFileSync(file, content, "utf8");
  touched += 1;
  replacements += beforeCount - afterCount;
}

console.log(`phase10-height: ${touched} files, ~${replacements} height tokens migrated to h-8`);
