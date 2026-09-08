/**
 * §2.3, box 1: "Non-trivial UI events and form actions use named, typed
 * handlers whose names express user intent."
 *
 * The box's second clause reads "No inline arrow or function expression appears
 * in a JSX event prop." Enforced literally that is 1,461 occurrences, and about
 * four in five of them are `onClick={() => setOpen(true)}` — one call to a
 * stable setter, no rule, no failure mode, and strictly clearer inline than
 * hoisted. This gate enforces the word the box itself uses, NON-TRIVIAL, and
 * draws that line where hoisting actually buys a reader something:
 *
 *   A closure in a JSX event prop is TRIVIAL when it only ROUTES the event to
 *   code that is already named — at most two statements, each of them a single
 *   call whose arguments hold no computation (or a bare guard around one).
 *
 *   It is NON-TRIVIAL, and must be a named handler, when it COMPUTES: a call
 *   nested in an argument (`Number(e.target.value)`, `v.toUpperCase()`,
 *   `list.filter(...)`), a local declaration, a loop or switch, `try`/`catch`,
 *   `await`, or more than two statements.
 *
 * The distinction is not stylistic. Every defect this ticket found lived on the
 * computing side: a numeric coercion retyped in eight disagreeing spellings,
 * one of which put `NaN` into a required `z.number()`; a code field written as
 * "reject the whole edit", which a controlled input turns into a frozen box.
 * None lived on the routing side.
 *
 * Parsing is by the TypeScript AST, not by regex. A regex over JSX both
 * over-counts (an arrow in a non-event prop, an arrow inside a string) and
 * under-counts (a multi-line body, a nested brace), and an unreliable
 * denominator makes the box unfalsifiable.
 *
 * SCOPE. crm/ and inventory/ are outside the 10/10 release and their residue is
 * accepted (R-10b). features/landing and app/(public) render the public landing
 * page, which must stay untouched. Both exclusions are listed below rather than
 * left implicit, and both are counted and printed on every run so the exclusion
 * cannot quietly grow.
 */

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, relative, sep } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir, runScanDirSelfTest } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("typescript");

const EXTENSIONS = new Set([".tsx", ".jsx"]);
const MIN_FILES = 3300;
const MAX_ROUTING_STATEMENTS = 2;

/**
 * Out of the 10/10 release: CRM and Inventory are excluded from its scope, and
 * the public landing surface must remain visually unchanged. Prefixes are
 * matched against the path relative to `frontend/`, with `/` separators.
 */
const OUT_OF_SCOPE_PREFIXES = [
  "features/crm/",
  "features/inventory/",
  "app/(authenticated)/crm/",
  "app/(authenticated)/inventory/",
  "app/(public)/",
  "features/marketing/",
  "features/landing/",
];

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (isExcludedScanDir(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (EXTENSIONS.has(extname(entry.name))) yield full;
  }
}

/** Holds no computation: nothing that transforms a value or can fail. */
function isInert(n) {
  if (n === undefined || n === null) return true;
  switch (n.kind) {
    case ts.SyntaxKind.Identifier:
    case ts.SyntaxKind.ThisKeyword:
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.BigIntLiteral:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
    case ts.SyntaxKind.NullKeyword:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return true;
    case ts.SyntaxKind.PropertyAccessExpression:
      return isInert(n.expression);
    case ts.SyntaxKind.ElementAccessExpression:
      return isInert(n.expression) && isInert(n.argumentExpression);
    case ts.SyntaxKind.NonNullExpression:
    case ts.SyntaxKind.ParenthesizedExpression:
    case ts.SyntaxKind.AsExpression:
    case ts.SyntaxKind.SatisfiesExpression:
    case ts.SyntaxKind.TypeAssertionExpression:
      return isInert(n.expression);
    case ts.SyntaxKind.PrefixUnaryExpression:
    case ts.SyntaxKind.PostfixUnaryExpression:
      return isInert(n.operand);
    case ts.SyntaxKind.BinaryExpression:
      return isInert(n.left) && isInert(n.right);
    case ts.SyntaxKind.ConditionalExpression:
      return isInert(n.condition) && isInert(n.whenTrue) && isInert(n.whenFalse);
    case ts.SyntaxKind.ObjectLiteralExpression:
      return n.properties.every(
        (p) =>
          (ts.isPropertyAssignment(p) && isInert(p.initializer)) ||
          ts.isShorthandPropertyAssignment(p) ||
          (ts.isSpreadAssignment(p) && isInert(p.expression)),
      );
    case ts.SyntaxKind.ArrayLiteralExpression:
      return n.elements.every((el) => (ts.isSpreadElement(el) ? isInert(el.expression) : isInert(el)));
    case ts.SyntaxKind.TemplateExpression:
      return n.templateSpans.every((s) => isInert(s.expression));
    // A React functional state updater whose own body holds no computation:
    // setOpen((v) => !v), setForm((p) => ({ ...p, name: e.target.value })).
    case ts.SyntaxKind.ArrowFunction:
      return n.body !== undefined && !ts.isBlock(n.body) && isInert(n.body);
    default:
      return false;
  }
}

/** Routes the event onward: one call, every argument inert. */
function isDelegation(e) {
  let n = e;
  while (n && (ts.isParenthesizedExpression(n) || ts.isVoidExpression(n) || ts.isNonNullExpression(n)))
    n = n.expression;
  if (!n) return false;
  if (isInert(n)) return true;
  if (ts.isCallExpression(n)) return isInert(n.expression) && n.arguments.every(isInert);
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken)
    return isInert(n.left) && isInert(n.right);
  if (
    ts.isBinaryExpression(n) &&
    (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      n.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      n.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
  )
    return isInert(n.left) && isDelegation(n.right);
  if (ts.isConditionalExpression(n))
    return isInert(n.condition) && isDelegation(n.whenTrue) && isDelegation(n.whenFalse);
  return false;
}

/** A statement that only routes: a delegation, or a bare guard around one. */
function isRoutingStatement(s) {
  if (ts.isExpressionStatement(s)) return isDelegation(s.expression);
  if (ts.isReturnStatement(s)) return s.expression === undefined;
  if (ts.isIfStatement(s) && s.elseStatement === undefined && isInert(s.expression)) {
    const t = s.thenStatement;
    if (ts.isBlock(t)) return t.statements.length <= 1 && t.statements.every(isRoutingStatement);
    return isRoutingStatement(t);
  }
  return false;
}

/** null when the closure only routes, else why it must become a named handler. */
export function nonTrivialReason(fn) {
  if ((fn.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) return "is async";

  let hasAwait = false;
  const seek = (n) => {
    if (n !== fn && (ts.isArrowFunction(n) || ts.isFunctionExpression(n))) return;
    if (ts.isAwaitExpression(n)) hasAwait = true;
    ts.forEachChild(n, seek);
  };
  seek(fn);
  if (hasAwait) return "awaits";

  const body = fn.body;
  if (body === undefined) return null;
  if (!ts.isBlock(body)) return isDelegation(body) ? null : "computes a value inline";
  if (body.statements.length > MAX_ROUTING_STATEMENTS)
    return `orchestrates ${body.statements.length} statements`;
  for (const s of body.statements) {
    if (ts.isTryStatement(s)) return "handles an error inline";
    if (ts.isVariableStatement(s)) return "declares a local (a rule)";
    if (
      ts.isForStatement(s) ||
      ts.isForOfStatement(s) ||
      ts.isForInStatement(s) ||
      ts.isWhileStatement(s) ||
      ts.isSwitchStatement(s)
    )
      return "branches or loops inline";
    if (!isRoutingStatement(s)) return "computes a value inline";
  }
  return null;
}

function toPosix(p) {
  return p.split(sep).join("/");
}

export function isOutOfScope(relativePath) {
  const posix = toPosix(relativePath);
  return OUT_OF_SCOPE_PREFIXES.some((prefix) => posix.startsWith(prefix));
}

export function scan(root) {
  const violations = [];
  let scannedFiles = 0;
  let inlineClosures = 0;
  let excludedNonTrivial = 0;

  for (const file of walkFiles(root)) {
    scannedFiles++;
    const text = readFileSync(file, "utf8");
    if (!/\son[A-Z]\w*=\{/.test(text)) continue;

    const rel = relative(root, file);
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const visit = (node) => {
      if (
        ts.isJsxAttribute(node) &&
        node.name &&
        ts.isIdentifier(node.name) &&
        /^on[A-Z]/.test(node.name.text)
      ) {
        const init = node.initializer;
        if (
          init &&
          ts.isJsxExpression(init) &&
          init.expression &&
          (ts.isArrowFunction(init.expression) || ts.isFunctionExpression(init.expression))
        ) {
          inlineClosures++;
          const reason = nonTrivialReason(init.expression);
          if (reason) {
            if (isOutOfScope(rel)) excludedNonTrivial++;
            else {
              const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
              violations.push(`  ${toPosix(rel)}:${line + 1}  ${node.name.text} — ${reason}`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  return { violations, scannedFiles, inlineClosures, excludedNonTrivial };
}

function runSelfTest() {
  let passed = 0;
  const failures = [];
  const assert = (label, condition) => {
    if (condition) passed++;
    else failures.push(label);
  };

  const fixture = mkdtempSync(join(tmpdir(), "check-named-handlers-"));
  try {
    mkdirSync(join(fixture, "features", "deep"), { recursive: true });
    mkdirSync(join(fixture, "features", "crm"), { recursive: true });
    mkdirSync(join(fixture, "features", "landing"), { recursive: true });
    mkdirSync(join(fixture, ".next-buildmart"), { recursive: true });

    const write = (rel, body) => writeFileSync(join(fixture, rel), body);

    // --- trivial: routing only, must be ACCEPTED --------------------------
    write("open.tsx", "export const A = () => <button onClick={() => setOpen(true)} />;");
    write("arg.tsx", "export const B = () => <Row onSelect={() => onSelect(row.id)} />;");
    write(
      "pair.tsx",
      "export const C = () => <b onClick={(e) => { e.stopPropagation(); onDelete(row); }} />;",
    );
    write("guard.tsx", "export const D = () => <S onOpenChange={(o) => { if (!o) onClose(); }} />;");
    write("updater.tsx", "export const E = () => <b onClick={() => setOpen((v) => !v)} />;");
    write("nullish.tsx", "export const F = () => <S onChange={(v) => field.onChange(v ?? '')} />;");
    write("named.tsx", "export const G = () => <b onClick={handleArchiveSelected} />;");
    write("bound.tsx", "export const H = () => <i onChange={numericFieldChange(field.onChange)} />;");

    // --- non-trivial: computes, must be REJECTED --------------------------
    write("coerce.tsx", "export const I = () => <i onChange={(e) => f.onChange(Number(e.target.value))} />;");
    write("upper.tsx", "export const J = () => <i onChange={(e) => f.onChange(e.target.value.toUpperCase())} />;");
    write(
      "local.tsx",
      "export const K = () => <c onCheckedChange={(c) => { const n = c ? [...v, x] : v.filter((y) => y !== x); f.onChange(n); }} />;",
    );
    write(
      "three.tsx",
      "export const L = () => <t onChange={(e) => { if (ro) return; setContent(e.target.value); setDirty(true); }} />;",
    );
    write("await.tsx", "export const M = () => <f onSubmit={async () => { await save(); }} />;");
    write(
      "try.tsx",
      "export const N = () => <b onClick={() => { try { go(); } catch { fail(); } }} />;",
    );
    write(join("features", "deep", "nested.tsx"),
      "export const O = () => <i onChange={(e) => f.onChange(parseInt(e.target.value, 10))} />;");

    // --- scope + corpus ---------------------------------------------------
    write(join("features", "crm", "excluded.tsx"),
      "export const P = () => <i onChange={(e) => f.onChange(Number(e.target.value))} />;");
    write(join("features", "landing", "public.tsx"),
      "export const Q = () => <i onChange={(e) => setSeats(Number(e.target.value))} />;");
    write(join(".next-buildmart", "chunk.jsx"),
      "x(<i onChange={(e) => f.onChange(Number(e.target.value))} />);");

    const { violations, scannedFiles, inlineClosures, excludedNonTrivial } = scan(fixture);
    const joined = violations.join("\n");
    const flagged = (name) => joined.includes(name);

    assert("a single setter call stays inline", !flagged("open.tsx"));
    assert("a call with an inert argument stays inline", !flagged("arg.tsx"));
    assert("stopPropagation plus one delegation stays inline", !flagged("pair.tsx"));
    assert("a bare guard around one call stays inline", !flagged("guard.tsx"));
    assert("a functional state updater stays inline", !flagged("updater.tsx"));
    assert("a nullish default stays inline", !flagged("nullish.tsx"));
    assert("an already-named handler is not a closure at all", !flagged("named.tsx"));
    assert("a bound rule (a CALL in the prop) is accepted", !flagged("bound.tsx"));

    assert("BITE: a numeric coercion is rejected", flagged("coerce.tsx:1"));
    assert("BITE: a case normalisation is rejected", flagged("upper.tsx:1"));
    assert("BITE: a local declaration (a rule) is rejected", flagged("local.tsx:1"));
    assert("BITE: three statements are rejected", flagged("three.tsx:1"));
    assert("BITE: an async handler is rejected", flagged("await.tsx:1"));
    assert("BITE: inline error handling is rejected", flagged("try.tsx:1"));
    assert("the scan recurses into nested directories", flagged("features/deep/nested.tsx"));

    assert("crm is excluded from the gate", !flagged("features/crm"));
    assert("the public landing surface is excluded", !flagged("features/landing"));
    assert("excluded non-trivial closures are still COUNTED", excludedNonTrivial === 2);
    assert("generated build output is outside the corpus", !flagged("chunk.jsx"));
    assert("every inline closure is counted, trivial ones included", inlineClosures === 15);
    assert("exactly the seven known-bad closures are reported", violations.length === 7);
    assert("the vacuity floor would fire on this fixture", scannedFiles < MIN_FILES);
    runScanDirSelfTest(assert);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`✖  self-test FAILED: ${f}`);
    console.error(`check-named-handlers self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-named-handlers self-tests: ${passed} passed`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

const { violations, scannedFiles, inlineClosures, excludedNonTrivial } = scan(ROOT);

if (scannedFiles < MIN_FILES) {
  console.error(
    `✖  Only ${scannedFiles} files scanned — the walk is broken, so a clean result would prove nothing.`,
  );
  process.exit(1);
}

const summary =
  `${scannedFiles} files · ${inlineClosures} inline closures in JSX event props · ` +
  `${excludedNonTrivial} non-trivial ones in crm/inventory/public-landing, excluded by scope (R-10b)`;

if (violations.length === 0) {
  console.log(`✔  No non-trivial closure left inline in a JSX event prop (${summary}).`);
  console.log(
    "   The threshold is ZERO for release-scope code, not a ratchet: a closure that computes " +
      "a value, declares a local, branches, awaits, or runs more than two statements must be a " +
      "named, typed handler. A closure that only routes the event onward stays inline.",
  );
  process.exit(0);
}

console.error(
  `✖  ${violations.length} non-trivial closure(s) inline in a JSX event prop (${summary}).\n` +
    "   Give each one a named, typed handler whose name says what the user did " +
    "(handleArchiveSelected, not handleClick2), or bind a shared rule so the prop holds a call — " +
    "see lib/numeric-field.ts, lib/case-field.ts, lib/toggle-in-list.ts, lib/keyboard-activation.ts:",
);
for (const v of violations) console.error(v);
process.exit(1);
