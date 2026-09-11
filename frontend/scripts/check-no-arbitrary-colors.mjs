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
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);
const HEX_ARBITRARY = /-\[#[0-9a-fA-F]/;

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
  if (!HEX_ARBITRARY.test(content)) continue;
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (HEX_ARBITRARY.test(line)) {
      violations.push(`  ${relative(ROOT, file)}:${i + 1}  ${line.trim()}`);
    }
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
