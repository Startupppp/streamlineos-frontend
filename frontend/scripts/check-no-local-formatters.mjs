import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
/*
  `isExcludedScanDir` (check-repo-paths.mjs) skips every dot-directory, the
  `.next*` build outputs among them, plus node_modules and feedbucket-widget.
  scripts/ holds the gates themselves and stays out of their own corpus, as it
  was before the shared helper replaced this file's own list.
*/
const EXTRA_EXCLUDED_DIRS = new Set(["scripts"]);
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);
const LOCAL_FORMATTER = /new\s+Intl\.NumberFormat\s*\(/;
const CANONICAL_PATH = "lib/format-utils.ts";

export const KNOWN_EXCEPTIONS = [
  {
    file: "lib/accounting/money.ts",
    line: 59,
    reason: "GL money library: renders integer minor units at the currency's ISO 4217 scale (minimum = maximum = 0, 2 or 3 digits) in a per-currency locale, with an optional symbol-less decimal style and signDisplay. format-utils takes major units at Intl's default digits and has no fixed-scale or symbol-less form, so routing through it is not output-identical.",
  },
  {
    file: "lib/accounting/money.ts",
    line: 69,
    reason: "GL money library's compact form over minor units. format-utils' formatMoneyCompact matches it for finite amounts but coerces NaN and Infinity to 0, so routing through it is not output-identical.",
  },
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

/**
 * The rule this gate is named for, widened past its original `Intl.NumberFormat`
 * regex.
 *
 * That regex was green over a corpus that held THREE `formatFileSize`
 * implementations — the canonical one, a divergent HR copy with no GB tier, and a
 * pure pass-through wrapper in chat — because none of them constructs an
 * `Intl.NumberFormat`. A gate that only notices one spelling of the defect
 * certifies the other two as clean. So the corpus is now read against the
 * canonical module's own export list: `lib/format-utils.ts` owns these names, and
 * a second declaration of one of them anywhere else is a fork unless it is an
 * adapter built ON the canonical implementation.
 *
 * PRD-C032 draws the line, and this encodes it verbatim:
 *   - a pass-through wrapper fails the deletion test and is a violation;
 *   - a fork that never imports the canonical module is a duplicated
 *     implementation and is a violation;
 *   - a module that imports the canonical implementation and adds real depth,
 *     policy or adaptation on top of it is retained.
 */
const CANONICAL_IMPORT = /from\s+"(?:@\/lib\/format-utils|\.{1,2}(?:\/\.\.)*\/lib\/format-utils)"/;
const EXPORTED_DECL =
  /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/;

export function canonicalExportNames(canonicalSource) {
  const names = new Set();
  for (const line of canonicalSource.split("\n")) {
    const match = EXPORTED_DECL.exec(line);
    if (match) names.add(match[1]);
  }
  return names;
}

/**
 * The declaration starting at `startIndex`, as a single string.
 *
 * Brace-balanced rather than line-shaped, because a multi-line signature is
 * common here — `export function formatMoney(<newline> value,<newline>): string {` —
 * and a reader that stops at the first line beginning with `)` captures the
 * signature and none of the body. That bug made a real adapter (payroll's
 * `formatMoney`, which delegates to `formatCurrencyFull`) look like a fork, so the
 * balance is load-bearing, not tidiness.
 */
export function declarationBody(lines, startIndex) {
  const body = [];
  let depth = 0;
  let opened = false;
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];
    if (i > startIndex && !opened && /^(?:export|import)\b/.test(line)) break;
    body.push(line);
    const stripped = line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`/g, "");
    for (const ch of stripped) {
      if (ch === "{" || ch === "[" || ch === "(") {
        depth += 1;
        opened = true;
      } else if (ch === "}" || ch === "]" || ch === ")") depth -= 1;
    }
    if (opened && depth <= 0) break;
  }
  return body.join("\n");
}

/**
 * True when the declaration's whole body is one `return canonicalFn(...)`.
 * That is PRD-C032's deletion test: the wrapper adds no depth, policy or
 * adaptation, so it is only a second name in front of the canonical
 * implementation.
 */
export function isPassThroughWrapper(body, canonicalNames) {
  const open = body.indexOf("{");
  if (open === -1) return false;
  const inner = body.slice(open + 1).replace(/\}[^}]*$/, "");
  const statements = inner
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"));
  if (statements.length !== 1) return false;
  const call = /^return\s+_?([A-Za-z_$][\w$]*)\s*\(/.exec(statements[0]);
  if (!call) return false;
  return canonicalNames.has(call[1].replace(/^_/, ""));
}

/**
 * Every re-declaration of a canonical export outside `lib/format-utils.ts`,
 * classified. `verdict` is "pass-through", "fork" or null (a retained adapter).
 */
export function findCanonicalRedeclarations(source, canonicalNames) {
  const lines = source.split("\n");
  const delegates = CANONICAL_IMPORT.test(source);
  const findings = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = EXPORTED_DECL.exec(lines[i]);
    if (!match || !canonicalNames.has(match[1])) continue;
    const body = declarationBody(lines, i);
    let verdict = null;
    if (isPassThroughWrapper(body, canonicalNames)) verdict = "pass-through";
    else if (!delegates) verdict = "fork";
    else {
      const mentionsCanonical = [...canonicalNames].some(
        (name) => name !== match[1] && new RegExp(`\\b${name}\\b`).test(body),
      );
      if (!mentionsCanonical) verdict = "fork";
    }
    if (verdict) findings.push({ line: i + 1, name: match[1], verdict, text: lines[i].trim() });
  }
  return findings;
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
    if (isExcludedScanDir(entry.name) || EXTRA_EXCLUDED_DIRS.has(entry.name)) continue;
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

  let checksRun = 1;
  const spaced = "const f = new   Intl.NumberFormat (opts);";
  checksRun++;
  if (!isLocalFormatterLine(spaced))
    failures.push("(b) failed to detect a whitespace-padded form");

  for (const benign of [
    'import { formatMoney } from "@/lib/format-utils";',
    "const d = new Intl.DateTimeFormat(locale);",
    "formatMoneyCompact(value, display)",
  ]) {
    checksRun++;
    if (isLocalFormatterLine(benign))
      failures.push(`(c) false positive on: ${benign}`);
  }

  const block = [
    "const a = 1;",
    'const f = new Intl.NumberFormat("en-US");',
    "const b = 2;",
  ].join("\n");
  const found = findFormatterLines(block);
  checksRun++;
  if (found.length !== 1 || found[0].line !== 2)
    failures.push("(d) line attribution is wrong");

  let scanned = 0;
  checksRun++;
  for (const _file of walkFiles(ROOT)) scanned += 1;
  if (scanned < 500)
    failures.push(`(e) the walk found only ${scanned} files — it is not scanning the tree`);

  const canonical = canonicalExportNames(
    readFileSync(join(ROOT, CANONICAL_PATH), "utf8"),
  );
  checksRun++;
  if (canonical.size < 10)
    failures.push(
      `(f) only ${canonical.size} canonical export(s) parsed from ${CANONICAL_PATH} — the owner list is broken, so a clean result would prove nothing`,
    );
  checksRun++;
  if (!canonical.has("formatFileSize") || !canonical.has("getInitials"))
    failures.push("(g) the canonical export list is missing a known member");

  const wrapper = [
    'import { formatFileSize as _formatFileSize } from "@/lib/format-utils";',
    "export function formatFileSize(bytes: number): string {",
    "  return _formatFileSize(bytes);",
    "}",
  ].join("\n");
  checksRun++;
  if (findCanonicalRedeclarations(wrapper, canonical)[0]?.verdict !== "pass-through")
    failures.push("(h) a pure pass-through wrapper of a canonical export was not detected");

  const fork = [
    "export function formatFileSize(bytes: number | null): string {",
    '  if (!bytes) return "—";',
    "  return `${(bytes / 1024).toFixed(0)} KB`;",
    "}",
  ].join("\n");
  checksRun++;
  if (findCanonicalRedeclarations(fork, canonical)[0]?.verdict !== "fork")
    failures.push("(i) a divergent fork of a canonical export was not detected");

  const adapter = [
    'import { formatCurrencyFull } from "@/lib/format-utils";',
    "export function formatMoney(value: string | null, currency = \"INR\"): string {",
    '  if (value === null || value === "") return "—";',
    "  const amount = parseFloat(value);",
    '  if (!Number.isFinite(amount)) return "—";',
    "  return formatCurrencyFull(amount, currency);",
    "}",
  ].join("\n");
  checksRun++;
  if (findCanonicalRedeclarations(adapter, canonical).length !== 0)
    failures.push("(j) an adapter built on the canonical implementation was wrongly flagged");

  checksRun++;
  if (findCanonicalRedeclarations("export function unrelatedHelper() { return 1; }", canonical).length !== 0)
    failures.push("(k) false positive on a name the canonical module does not own");

  if (failures.length > 0) {
    console.error("✖  Self-test FAILED:");
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }

  // Counted, not narrated: the literal "(5 assertions)" that used to sit here undercounted the
  // (c) loop, which is three checks of its own. See v2 ticket 30.
  console.log(`PASS: self-test (${checksRun} assertions)\n`);
  console.log("  (a) detects a local Intl.NumberFormat");
  console.log("  (b) detects a whitespace-padded form");
  console.log("  (c) no false positive on imports, DateTimeFormat or canonical helpers");
  console.log("  (d) attributes the finding to the right line");
  console.log(`  (e) the walk reaches the tree (${scanned} files scanned)`);
  console.log(`  (f) the canonical owner list parses (${canonical.size} exports)`);
  console.log("  (g) the canonical owner list names known members");
  console.log("  (h) detects a pure pass-through wrapper of a canonical export");
  console.log("  (i) detects a divergent fork of a canonical export");
  console.log("  (j) retains an adapter built on the canonical implementation");
  console.log("  (k) no false positive on a name the canonical module does not own");
  process.exit(0);
}

if (process.argv.includes("--self-test")) selfTest();

validateExceptions(KNOWN_EXCEPTIONS);

const exceptionSet = new Set(
  KNOWN_EXCEPTIONS.map((e) => `${e.file}:${e.line}`),
);
const matchedExceptions = new Set();

const violations = [];
const redeclarations = [];
let scannedFiles = 0;

const canonicalNames = canonicalExportNames(
  readFileSync(join(ROOT, CANONICAL_PATH), "utf8"),
);
if (canonicalNames.size < 10) {
  console.error(
    `✖  Only ${canonicalNames.size} export(s) parsed from ${CANONICAL_PATH} — the canonical owner list is broken, so a clean result would prove nothing.`,
  );
  process.exit(1);
}

for (const file of walkFiles(ROOT)) {
  scannedFiles += 1;
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (rel === CANONICAL_PATH) continue;

  const content = readFileSync(file, "utf8");

  for (const finding of findCanonicalRedeclarations(content, canonicalNames)) {
    redeclarations.push(
      `  ${rel}:${finding.line}  [${finding.verdict}] ${finding.text}`,
    );
  }

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

if (redeclarations.length > 0) {
  console.error(
    `✖  ${redeclarations.length} declaration(s) outside ${CANONICAL_PATH} re-declare a name that module owns.\n` +
    `   [pass-through] adds nothing to the canonical implementation — delete it and import from @/lib/format-utils (PRD-C032's deletion test).\n` +
    `   [fork] is a second implementation that never imports the canonical one — delete it, or, if the behaviour is genuinely different,\n` +
    `   build it ON @/lib/format-utils and give it a name that module does not own:`,
  );
  for (const r of redeclarations) console.error(r);
  process.exit(1);
}

if (violations.length === 0) {
  console.log(`✔  No local Intl.NumberFormat formatters and no re-declaration of the ${canonicalNames.size} names lib/format-utils.ts owns (${scannedFiles} files scanned).`);
  process.exit(0);
} else {
  console.error(
    `✖  ${violations.length} local Intl.NumberFormat formatter(s) found outside the canonical lib/format-utils.ts.\n` +
    `   Use formatMoney, formatMoneyCompact, formatCurrencyFull, or formatCurrencyForBilling from lib/format-utils instead:`,
  );
  for (const v of violations) console.error(v);
  process.exit(1);
}
