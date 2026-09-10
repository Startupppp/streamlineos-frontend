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
const LOCAL_FORMATTER = /new\s+Intl\.NumberFormat\s*\(/;
const CANONICAL_PATH = "lib/format-utils.ts";

export const KNOWN_EXCEPTIONS = [
];

export function isLocalFormatterLine(line) {
  return LOCAL_FORMATTER.test(line);
}

export function findFormatterLines(source) {
  return source
    .split("\n")
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter((entry) => isLocalFormatterLine(entry.text));
}

function validateExceptions(exceptions) {
  for (const entry of exceptions) {
    if (!entry.reason || !entry.reason.trim()) {
      console.error(`✖  Exception entry for ${entry.file}:${entry.line} has no reason — every exception must document why it is valid.`);
      process.exit(1);
    }
  }
}

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

function selfTest() {
  console.log("Running self-test...\n");
  const failures = [];

  const positive = 'const f = new Intl.NumberFormat("en-IN", { style: "currency" });';
  if (!isLocalFormatterLine(positive))
    failures.push("(a) failed to detect a known local Intl.NumberFormat");

  const spaced = "const f = new   Intl.NumberFormat (opts);";
  if (!isLocalFormatterLine(spaced))
    failures.push("(b) failed to detect a whitespace-padded form");

  for (const benign of [
    'import { formatMoney } from "@/lib/format-utils";',
    "const d = new Intl.DateTimeFormat(locale);",
    "formatMoneyCompact(value, display)",
  ])
    if (isLocalFormatterLine(benign))
      failures.push(`(c) false positive on: ${benign}`);

  const block = [
    "const a = 1;",
    'const f = new Intl.NumberFormat("en-US");',
    "const b = 2;",
  ].join("\n");
  const found = findFormatterLines(block);
  if (found.length !== 1 || found[0].line !== 2)
    failures.push("(d) line attribution is wrong");

  let scanned = 0;
  for (const _file of walkFiles(ROOT)) scanned += 1;
  if (scanned < 500)
    failures.push(`(e) the walk found only ${scanned} files — it is not scanning the tree`);

  if (failures.length > 0) {
    console.error("✖  Self-test FAILED:");
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }

  console.log("PASS: self-test (5 assertions)\n");
  console.log("  (a) detects a local Intl.NumberFormat");
  console.log("  (b) detects a whitespace-padded form");
  console.log("  (c) no false positive on imports, DateTimeFormat or canonical helpers");
  console.log("  (d) attributes the finding to the right line");
  console.log(`  (e) the walk reaches the tree (${scanned} files scanned)`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) selfTest();

validateExceptions(KNOWN_EXCEPTIONS);

const exceptionSet = new Set(
  KNOWN_EXCEPTIONS.map((e) => `${e.file}:${e.line}`),
);
const matchedExceptions = new Set();

const violations = [];
let scannedFiles = 0;

for (const file of walkFiles(ROOT)) {
  scannedFiles += 1;
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (rel === CANONICAL_PATH) continue;

  const content = readFileSync(file, "utf8");
  if (!LOCAL_FORMATTER.test(content)) continue;

  for (const entry of findFormatterLines(content)) {
    const key = `${rel}:${entry.line}`;
    if (exceptionSet.has(key)) {
      matchedExceptions.add(key);
      continue;
    }
    violations.push(`  ${rel}:${entry.line}  ${entry.text}`);
  }
}

if (scannedFiles < 500) {
  console.error(
    `✖  Only ${scannedFiles} files scanned — the walk is broken, so a clean result would prove nothing.`,
  );
  process.exit(1);
}

const staleExceptions = KNOWN_EXCEPTIONS.filter(
  (e) => !matchedExceptions.has(`${e.file}:${e.line}`),
);
if (staleExceptions.length > 0) {
  console.error(
    `✖  ${staleExceptions.length} stale exception(s) in KNOWN_EXCEPTIONS — remove entries that no longer match a finding:`,
  );
  for (const e of staleExceptions) console.error(`  ${e.file}:${e.line}  (${e.reason})`);
  process.exit(1);
}

if (violations.length === 0) {
  console.log(`✔  No local Intl.NumberFormat formatters found outside lib/format-utils.ts (${scannedFiles} files scanned).`);
  process.exit(0);
} else {
  console.error(
    `✖  ${violations.length} local Intl.NumberFormat formatter(s) found outside the canonical lib/format-utils.ts.\n` +
    `   Use formatMoney, formatMoneyCompact, formatCurrencyFull, or formatCurrencyForBilling from lib/format-utils instead:`,
  );
  for (const v of violations) console.error(v);
  process.exit(1);
}
