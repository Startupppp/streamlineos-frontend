import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXCLUDE_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", "scripts"]);
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);
const HEX_ARBITRARY = /-\[#[0-9a-fA-F]/;

function findHexViolations(content) {
  const hits = [];
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (HEX_ARBITRARY.test(line)) hits.push(i + 1);
  });
  return hits;
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

  const badFixture = `<div className="bg-[#3b82f6] text-[#ffffff]">bad color</div>`;
  if (findHexViolations(badFixture).length === 0) {
    process.stderr.write("  FAIL  hex arbitrary color was not detected in bad fixture\n");
    failed++;
  } else {
    process.stdout.write("  PASS  hex arbitrary color correctly detected in bad fixture\n");
    passed++;
  }

  const goodFixture = `<div className="bg-primary text-foreground">good color</div>`;
  if (findHexViolations(goodFixture).length > 0) {
    process.stderr.write("  FAIL  token-based color incorrectly flagged in good fixture\n");
    failed++;
  } else {
    process.stdout.write("  PASS  token-based color correctly not flagged\n");
    passed++;
  }

  const commentedFixture = `// bg-[#3b82f6] is shown as an example`;
  if (findHexViolations(commentedFixture).length === 0) {
    process.stderr.write("  FAIL  hex color in comment was not detected (comments are not exempted by design)\n");
    failed++;
  } else {
    process.stdout.write("  PASS  hex color in comment correctly detected (no exemption for comments)\n");
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
  const hits = findHexViolations(content);
  if (hits.length === 0) continue;
  const lines = content.split("\n");
  hits.forEach((lineNum) => {
    violations.push(`  ${relative(ROOT, file)}:${lineNum}  ${lines[lineNum - 1].trim()}`);
  });
}

if (scannedFiles < 500) {
  console.error(`✖  Only ${scannedFiles} files scanned — the walk is broken, so a clean result would prove nothing.`);
  process.exit(1);
}

if (violations.length === 0) {
  console.log("✔  No arbitrary Tailwind hex colour classes found.");
  process.exit(0);
} else {
  console.error(`✖  ${violations.length} arbitrary Tailwind hex colour class(es) — use a CSS token instead:`);
  for (const v of violations) console.error(v);
  process.exit(1);
}
