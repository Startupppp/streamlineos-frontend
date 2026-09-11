import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXCLUDE_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", "scripts"]);

/*
  A build directory is any name starting with `.next`, not the one called
  exactly `.next`. A dev server run with a custom `distDir` (`.next-local`)
  left its Turbopack output here and this walk read all of it: two gates went
  red over compiled chunks and the rest merely scanned 718MB for nothing.
*/
function isBuildDir(name) {
  return name.startsWith(".next");
}
const EXTENSIONS = new Set([".tsx", ".jsx"]);

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if ((EXCLUDE_DIRS.has(entry.name) || isBuildDir(entry.name))) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else if (EXTENSIONS.has(extname(entry.name))) {
      yield full;
    }
  }
}

const violations = [];
let scannedFiles = 0;

for (const file of walkFiles(ROOT)) {
  scannedFiles++;
  const content = readFileSync(file, "utf8");
  if (!content.includes('size="icon"')) continue;

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('size="icon"')) continue;

    // Collect the prop block: from the nearest opening tag back to i, and forward
    // until the closing > of the opening tag (max 12 lines each way).
    const before = lines.slice(Math.max(0, i - 12), i).join("\n");
    const after = lines.slice(i + 1, Math.min(lines.length, i + 12)).join("\n");
    const context = before + "\n" + lines[i] + "\n" + after;

    // Canonical wrappers already enforce accessible names.
    if (
      context.includes("AnimatedIconButton") ||
      context.includes("TooltipIconButton") ||
      context.includes("TooltipTrigger")
    )
      continue;

    // Accessible name present in the surrounding prop block.
    if (
      context.includes("aria-label") ||
      context.includes("aria-labelledby") ||
      context.includes("sr-only")
    )
      continue;

    violations.push(`  ${relative(ROOT, file)}:${i + 1}`);
  }
}

if (scannedFiles < 500) {
  console.error(`✖  Only ${scannedFiles} files scanned — the walk is broken, so a clean result would prove nothing.`);
  process.exit(1);
}

if (violations.length === 0) {
  console.log(
    "✔  No icon-only buttons without an accessible name found.",
  );
  process.exit(0);
} else {
  console.error(
    `✖  ${violations.length} icon-only button(s) without an accessible name.\n` +
      `   Add aria-label, aria-labelledby, or sr-only text; or use AnimatedIconButton / TooltipIconButton:`,
  );
  for (const v of violations) console.error(v);
  process.exit(1);
}
