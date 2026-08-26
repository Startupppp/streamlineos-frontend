import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXCLUDE_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", "scripts"]);
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);
const LOCAL_FORMATTER = /new\s+Intl\.NumberFormat\s*\(/;
const CANONICAL_PATH = "lib/format-utils.ts";

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

const violations = [];

for (const file of walkFiles(ROOT)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (rel === CANONICAL_PATH) continue;

  const content = readFileSync(file, "utf8");
  if (!LOCAL_FORMATTER.test(content)) continue;

  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (LOCAL_FORMATTER.test(line)) {
      violations.push(`  ${rel}:${i + 1}  ${line.trim()}`);
    }
  });
}

if (violations.length === 0) {
  console.log("✔  No local Intl.NumberFormat formatters found outside lib/format-utils.ts.");
  process.exit(0);
} else {
  console.error(
    `✖  ${violations.length} local Intl.NumberFormat formatter(s) found outside the canonical lib/format-utils.ts.\n` +
    `   Use formatMoney, formatMoneyCompact, formatCurrencyFull, or formatCurrencyForBilling from lib/format-utils instead:`,
  );
  for (const v of violations) console.error(v);
  process.exit(1);
}
