import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXCLUDE_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", "scripts"]);
const EXTENSIONS = new Set([".tsx", ".jsx"]);

function findUnlabeledIconButtons(lines) {
  const violations = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('size="icon"')) continue;

    const before = lines.slice(Math.max(0, i - 12), i).join("\n");
    const after = lines.slice(i + 1, Math.min(lines.length, i + 12)).join("\n");
    const context = before + "\n" + lines[i] + "\n" + after;

    if (
      context.includes("AnimatedIconButton") ||
      context.includes("TooltipIconButton") ||
      context.includes("TooltipTrigger")
    )
      continue;

    if (
      context.includes("aria-label") ||
      context.includes("aria-labelledby") ||
      context.includes("sr-only")
    )
      continue;

    violations.push(i + 1);
  }
  return violations;
}

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else if (EXTENSIONS.has(extname(entry.name))) {
      yield full;
    }
  }
}

const selfTest = process.argv.includes("--self-test");

if (selfTest) {
  let passed = 0;
  let failed = 0;

  const badLines = [
    '<Button variant="ghost" size="icon">',
    "  <SearchIcon className=\"h-4 w-4\" />",
    "</Button>",
  ];
  if (findUnlabeledIconButtons(badLines).length === 0) {
    process.stderr.write("  FAIL  icon button without aria-label was not detected\n");
    failed++;
  } else {
    process.stdout.write("  PASS  icon button without aria-label correctly detected\n");
    passed++;
  }

  const goodLines = [
    '<Button variant="ghost" size="icon" aria-label="Search">',
    "  <SearchIcon className=\"h-4 w-4\" />",
    "</Button>",
  ];
  if (findUnlabeledIconButtons(goodLines).length > 0) {
    process.stderr.write("  FAIL  icon button with aria-label was incorrectly flagged\n");
    failed++;
  } else {
    process.stdout.write("  PASS  icon button with aria-label correctly not flagged\n");
    passed++;
  }

  const tooltipLines = [
    "<TooltipTrigger asChild>",
    '  <Button variant="ghost" size="icon">',
    "    <SearchIcon className=\"h-4 w-4\" />",
    "  </Button>",
    "</TooltipTrigger>",
  ];
  if (findUnlabeledIconButtons(tooltipLines).length > 0) {
    process.stderr.write("  FAIL  icon button inside TooltipTrigger was incorrectly flagged\n");
    failed++;
  } else {
    process.stdout.write("  PASS  icon button inside TooltipTrigger correctly not flagged\n");
    passed++;
  }

  if (failed > 0) {
    process.stderr.write(`\n  SELF-TEST FAILED — ${failed} of ${passed + failed} assertions did not bite\n`);
    process.exit(1);
  }
  process.stdout.write(`\n  SELF-TEST PASSED — all ${passed} assertions bite correctly\n`);
  process.exit(0);
}

const violations = [];
let scannedFiles = 0;

for (const file of walkFiles(ROOT)) {
  scannedFiles++;
  const content = readFileSync(file, "utf8");
  if (!content.includes('size="icon"')) continue;

  const lines = content.split("\n");
  const lineNums = findUnlabeledIconButtons(lines);
  for (const lineNum of lineNums) {
    violations.push(`  ${relative(ROOT, file)}:${lineNum}`);
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
  console.error(`✖  ${violations.length} icon-only button(s) without an accessible name:`);
  for (const v of violations) console.error(v);
  process.exit(1);
}
