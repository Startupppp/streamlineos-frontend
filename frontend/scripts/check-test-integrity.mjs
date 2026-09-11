#!/usr/bin/env node
/**
 * check-test-integrity.mjs — the frontend half of "the test suite cannot lie".
 *
 * WHY THIS EXISTS
 * The backend carries four gates for this defect family
 * (check:test-suppressions, check:vacuous-assertions, check:bare-throw,
 * check:transaction-callbacks). The frontend carried none, on the recorded
 * ground that it "measures 0 in every class". That ground was WRONG when it was
 * measured here: running the backend detector against this package found two
 * live COND_ASSERT tests in hooks/api/notifications-inbox.test.ts, both named
 * "passes signal to apiClient.get" and both sitting behind
 * `if (apiClient.get.mock.calls.length > 0)` — a guard on the very fact the
 * test exists to prove. Proved by execution, not by reading: with both
 * notification hooks mutated to `enabled: false` so they never fetch at all,
 * the pre-fix spec passed 2/2. They are repaired; this gate is what stops the
 * next one.
 *
 * CLASSES (each ratcheted separately in baselines/test-integrity.json)
 *   NO_ASSERTION    a test body with no expect(), no throw, no assert-shaped
 *                   helper call. Nothing in it can fail.
 *   TAUTOLOGY       expect(<literal>).toBe(<the same literal>), or
 *                   toBeDefined/toBeTruthy on a truthy literal, or toBeFalsy on
 *                   a falsy one.
 *   COND_ASSERT     every assertion in the body sits inside `if (<reach guard>)`
 *                   — a guard on `.length`, `.mock.calls` or toHaveBeenCalled,
 *                   i.e. on whether the double was reached — with the else
 *                   branch absent or vacuous. HIGHEST-YIELD CLASS: it is
 *                   indistinguishable from a passing test in every report, and
 *                   it is the class that was actually live here.
 *   EARLY_RETURN    COND_ASSERT's other syntax: `it("...", () => { if (!x)
 *                   return; ... expect(...) })`. Every assertion below the
 *                   guard is conditional on it, but the AST shape differs so the
 *                   COND_ASSERT detector never sees it. Added after the backend
 *                   twin found 7 live sites, one of which passed over a foreign
 *                   key whose tenant column had been removed.
 *   FLOATING_ASSERT expect(p).resolves/.rejects.<matcher>(...) neither awaited
 *                   nor returned. It settles after the test has already passed.
 *   FOCUSED         it.only / describe.only / fit / fdescribe — silently drops
 *                   every sibling test from the run.
 *   SUPPRESSION     an unconditional it.skip / it.todo / xit / xdescribe. The
 *                   backend distinguishes an honest skip (names an
 *                   infrastructure blocker) from a quarantine; this package has
 *                   zero of either, so the ratchet is a hard 0 and the first one
 *                   must be argued for in the registry rather than merged.
 *   BARE_THROW      expect(...).toThrow() with NO argument, not negated. Such a
 *                   matcher is satisfied by a TypeError from a mis-shaped
 *                   double, so a test claiming a refusal passes on a crash.
 *                   `.not.toThrow()` is EXCLUDED by construction: a negated
 *                   matcher fails on any throw, so it cannot be satisfied by a
 *                   crash. All 19 bare sites in this package today are negated,
 *                   which is why this ratchet is 0 and not 19.
 *
 * WHAT A GREEN HERE DOES NOT MEAN (stated so the green is readable)
 *   - It does not mean assertions assert the right thing.
 *   - It does not see anything inside a helper the test calls.
 *   - It does not see expect(x).toEqual(y) where both sides come from the same
 *     broken source.
 *   A green means "every test that runs can fail for some reason".
 *
 * VACUITY FLOORS — the defect this ticket exists to remove is a gate that
 * reports OK over nothing. Four independent floors exit 2 INCONCLUSIVE rather
 * than 0: the file walk, the test-callback matcher, the expect() matcher and
 * the .toThrow() matcher. Each is bite-proved in the self-test and by neutering
 * the detector against the real tree.
 *
 * USAGE
 *   node scripts/check-test-integrity.mjs              # gate
 *   node scripts/check-test-integrity.mjs --list       # every finding
 *   node scripts/check-test-integrity.mjs --self-test  # fixture proof
 */
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require_ = createRequire(import.meta.url);
const ts = require_("typescript");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(HERE, "..");
const BASELINE_PATH = path.join(HERE, "baselines", "test-integrity.json");

const MIN_SPEC_FILES = 250;
const MIN_TEST_CALLBACKS = 1800;
const MIN_EXPECTS = 6000;
const MIN_THROW_MATCHERS = 10;

const CLASSES = [
  "NO_ASSERTION",
  "TAUTOLOGY",
  "COND_ASSERT",
  "EARLY_RETURN",
  "FLOATING_ASSERT",
  "FOCUSED",
  "SUPPRESSION",
  "BARE_THROW",
];

// "build" and "out" are DELIBERATELY ABSENT. The delivery/strategy product module
// in this repository is named Build (CLAUDE.md §8), so features/build/,
// hooks/api/build/ and app/(authenticated)/build/ are live product code. An
// earlier draft of this gate skipped them as build output and reported OK over
// 17 live test files — the exact defect this ticket exists to remove. Next.js
// output is .next/ and .next-custom/; neither is a directory named "build".
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".next-custom",
  "dist",
  "coverage",
  "public",
  "scripts",
  "patches",
  "feedbucket-widget",
]);
const SPEC_RE = /(\.|-)(spec|test)\.(ts|tsx|mts|js|jsx)$/;

const TEST_FNS = new Set(["it", "test", "fit", "xit", "xtest"]);
const SUITE_FNS = new Set(["describe", "fdescribe", "xdescribe", "suite"]);
const SUPPRESSORS = ["skip", "todo", "failing"];

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (SPEC_RE.test(entry.name)) out.push(path.join(dir, entry.name));
  }
  return out;
}

function calleeText(node) {
  let expr = node.expression;
  const parts = [];
  while (ts.isPropertyAccessExpression(expr)) {
    parts.unshift(expr.name.text);
    expr = expr.expression;
  }
  if (ts.isCallExpression(expr))
    return calleeText(expr) + "()" + (parts.length ? "." + parts.join(".") : "");
  if (ts.isIdentifier(expr)) parts.unshift(expr.text);
  else return "<expr>";
  return parts.join(".");
}

function isLiteralish(node) {
  return (
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword ||
    (ts.isIdentifier(node) && node.text === "undefined")
  );
}

function matcherChain(expectCall) {
  let cur = expectCall;
  const parts = [];
  let isAsyncMatcher = false;
  let negated = false;
  while (cur.parent && ts.isPropertyAccessExpression(cur.parent) && cur.parent.expression === cur) {
    const name = cur.parent.name.text;
    parts.push(name);
    if (name === "resolves" || name === "rejects") isAsyncMatcher = true;
    if (name === "not") negated = true;
    cur = cur.parent;
    if (cur.parent && ts.isCallExpression(cur.parent) && cur.parent.expression === cur)
      return {
        matcher: parts.filter((p) => p !== "not").join("."),
        call: cur.parent,
        isAsyncMatcher,
        negated,
      };
  }
  return { matcher: null, call: null, isAsyncMatcher, negated };
}

function isAwaitedOrReturned(call) {
  let parent = call.parent;
  while (parent && ts.isParenthesizedExpression(parent)) parent = parent.parent;
  if (!parent) return false;
  return (
    ts.isAwaitExpression(parent) ||
    ts.isReturnStatement(parent) ||
    ts.isArrowFunction(parent) ||
    ts.isArrayLiteralExpression(parent) ||
    ts.isPropertyAccessExpression(parent) ||
    ts.isVariableDeclaration(parent)
  );
}

function testBody(callNode) {
  for (const arg of callNode.arguments ?? [])
    if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) return arg;
  return null;
}

const OTHER_ASSERT = /^(assert|ok|strictEqual|deepStrictEqual|fail|throws|doesNotThrow)$/;
const THROW_MATCHER = /^(toThrow|toThrowError)$/;

const SENTINEL_CACHE = new WeakMap();

/**
 * Identifiers this file asserts on OUTSIDE the given test body. "Outside" is
 * load-bearing: a guard's own identifier almost always appears in the
 * assertions it guards, so crediting those would exempt every early return
 * including the real ones.
 */
function sentinelAsserted(sf, exclude) {
  let byFile = SENTINEL_CACHE.get(sf);
  if (!byFile) {
    byFile = [];
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "expect"
      ) {
        const names = new Set();
        const collect = (n) => {
          if (ts.isIdentifier(n)) names.add(n.text);
          ts.forEachChild(n, collect);
        };
        for (const arg of node.arguments) collect(arg);
        byFile.push({ start: node.getStart(sf), end: node.getEnd(), names });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    SENTINEL_CACHE.set(sf, byFile);
  }
  const lo = exclude.getStart(sf);
  const hi = exclude.getEnd();
  const out = new Set();
  for (const e of byFile) {
    if (e.start >= lo && e.end <= hi) continue;
    for (const n of e.names) out.add(n);
  }
  return out;
}

function analyseBody(fn, sf, counters) {
  let expectCount = 0;
  let hasOtherAssertion = false;
  const tautologies = [];
  const floating = [];
  const conditional = [];
  const bareThrows = [];

  const visit = (node) => {
    if (ts.isThrowStatement(node)) hasOtherAssertion = true;

    if (ts.isIfStatement(node)) {
      const condText = node.expression.getText(sf);
      const thenHasExpect = /\bexpect\s*\(/.test(node.thenStatement.getText(sf));
      const elseText = node.elseStatement ? node.elseStatement.getText(sf) : "";
      const elseVacuous =
        !node.elseStatement ||
        /^\{?\s*expect\((true|1|\[\]|\{\})\)\.(toBe|toEqual)\(/.test(
          elseText.replace(/^\{\s*/, "").trim(),
        );
      const reachGuard =
        /\.length\s*(>|>=|!==|===|==)?/.test(condText) ||
        /\.mock\.calls/.test(condText) ||
        /toHaveBeenCalled/.test(condText);
      let noSiblingAssertion = true;
      if (!node.elseStatement) {
        const bodyText = fn.getText(sf);
        const start = fn.getStart(sf);
        const before = bodyText.slice(0, node.getStart(sf) - start);
        const after = bodyText.slice(node.getEnd() - start);
        noSiblingAssertion = !/\bexpect\s*\(/.test(before) && !/\bexpect\s*\(/.test(after);
      }
      if (thenHasExpect && elseVacuous && reachGuard && noSiblingAssertion)
        conditional.push({ node, detail: `if (${condText.slice(0, 70)})` });
    }

    if (ts.isCallExpression(node)) {
      const ct = calleeText(node);
      const base = ct.split(".")[0].replace("()", "");
      if (base === "expect") {
        expectCount += 1;
        counters.expects += 1;
        const arg = node.arguments?.[0];
        const chain = matcherChain(node);
        if (chain.matcher && THROW_MATCHER.test(chain.matcher)) {
          counters.throwMatchers += 1;
          if (chain.call.arguments.length === 0 && !chain.negated)
            bareThrows.push({ node: chain.call, detail: `.${chain.matcher}() with no argument` });
        }
        if (arg && isLiteralish(arg) && chain.matcher && chain.call) {
          const m = chain.matcher;
          const first = chain.call.arguments[0];
          const same = first && first.getText(sf).trim() === arg.getText(sf).trim();
          const truthy =
            arg.kind === ts.SyntaxKind.TrueKeyword ||
            (ts.isNumericLiteral(arg) && arg.text !== "0") ||
            (ts.isStringLiteral(arg) && arg.text !== "");
          if (
            (/^(toBe|toEqual|toStrictEqual)$/.test(m) && same) ||
            (/^(toBeDefined|toBeTruthy)$/.test(m) && truthy) ||
            (/^toBeFalsy$/.test(m) && !truthy)
          )
            tautologies.push({
              node,
              detail: `expect(${arg.getText(sf).slice(0, 30)}).${m}(...)`,
            });
        }
        if (chain.isAsyncMatcher && chain.call && !isAwaitedOrReturned(chain.call))
          floating.push({ node: chain.call, detail: chain.matcher ?? "resolves/rejects" });
      } else if (
        /(^|\.)expect$/.test(ct) ||
        OTHER_ASSERT.test(base) ||
        ct.includes("toMatchInlineSnapshot") ||
        (!TEST_FNS.has(base) && !SUITE_FNS.has(base) && /assert|expect|verify|check/i.test(base))
      )
        hasOtherAssertion = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(fn.body ?? fn);

  // A bare `if (guard) return;` at the top level of the body, no else, standing
  // ABOVE every assertion. Scanned over the body's own statement list, so a
  // guard inside a helper or a loop is not counted; and a guard with nothing to
  // silence is not a defect.
  const earlyReturns = [];
  if (fn.body && ts.isBlock(fn.body)) {
    let sawAssertion = false;
    for (const st of fn.body.statements) {
      if (!sawAssertion && ts.isIfStatement(st) && !st.elseStatement) {
        const t = st.thenStatement;
        const bare =
          (ts.isReturnStatement(t) && !t.expression) ||
          (ts.isBlock(t) &&
            t.statements.length === 1 &&
            ts.isReturnStatement(t.statements[0]) &&
            !t.statements[0].expression);
        if (bare)
          earlyReturns.push({
            node: st,
            detail: `if (${st.expression.getText(sf).slice(0, 70)}) return;`,
          });
      }
      const text = st.getText(sf);
      if (/\bexpect\s*\(/.test(text) || /\bthrow\b/.test(text)) sawAssertion = true;
    }
    if (!/\bexpect\s*\(/.test(fn.getText(sf))) earlyReturns.length = 0;

    // SENTINEL EXEMPTION. A guard whose own identifier is asserted by a sibling
    // test in the same file is not an escape hatch: the file goes red when the
    // guard is false, so the guarded tests cannot pass while asserting nothing.
    // This is not hypothetical — it is why this class reports 0 here and not 11.
    // The frontend's two cross-repo permission-catalog suites guard 11 tests on
    // `if (!backendAvailable) return;` and each carries
    //   it("can reach the backend catalog — the cross-repo checks below assert
    //      nothing without it", () => { expect({ backendAvailable, ... })
    //        .toEqual({ backendAvailable: true, ... }); });
    // Flagging those would have banked 11 sites of detector noise as debt.
    for (let i = earlyReturns.length - 1; i >= 0; i -= 1) {
      const ids = [];
      const collect = (n) => {
        if (ts.isIdentifier(n)) ids.push(n.text);
        ts.forEachChild(n, collect);
      };
      collect(earlyReturns[i].node.expression);
      const outside = sentinelAsserted(sf, fn);
      if (ids.some((id) => outside.has(id))) earlyReturns.splice(i, 1);
    }
  }

  return { expectCount, hasOtherAssertion, tautologies, floating, conditional, bareThrows, earlyReturns };
}

function scanFile(file, rel, counters, findings) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const titleOf = (node) => {
    const a = node.arguments?.[0];
    if (!a) return "";
    if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) return a.text.slice(0, 110);
    return "<non-literal>";
  };
  const push = (cls, node, testNode, detail) =>
    findings.push({ cls, file: rel, line: lineOf(node), title: titleOf(testNode), detail });

  const visit = (node) => {
    if (ts.isConditionalExpression(node)) {
      const t = node.getText(sf);
      if (/\b(describe|it|test)\.(skip|todo|failing)\b/.test(t)) counters.conditionalAliases += 1;
    }
    if (ts.isCallExpression(node)) {
      const ct = calleeText(node);
      const mods = ct.split(".").slice(1);
      const base = ct.split(".")[0].replace("()", "");
      const isTest = TEST_FNS.has(base);
      const isSuite = SUITE_FNS.has(base);
      const suppressed =
        SUPPRESSORS.some((s) => mods.includes(s)) ||
        ((isTest || isSuite) && base.startsWith("x"));

      if ((isTest || isSuite) && (mods.includes("only") || base === "fit" || base === "fdescribe"))
        push("FOCUSED", node, node, ct);

      if ((isTest || isSuite) && suppressed) {
        push("SUPPRESSION", node, node, ct);
        return;
      }

      if (isTest) {
        const body = testBody(node);
        if (body) {
          counters.testCallbacks += 1;
          const s = analyseBody(body, sf, counters);
          if (s.expectCount === 0 && !s.hasOtherAssertion)
            push("NO_ASSERTION", node, node, "no expect(), no throw, no assert helper");
          for (const t of s.tautologies) push("TAUTOLOGY", t.node, node, t.detail);
          for (const t of s.conditional) push("COND_ASSERT", t.node, node, t.detail);
          for (const t of s.earlyReturns) push("EARLY_RETURN", t.node, node, t.detail);
          for (const t of s.floating) push("FLOATING_ASSERT", t.node, node, t.detail);
          for (const t of s.bareThrows) push("BARE_THROW", t.node, node, t.detail);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function scanTree(root, roots) {
  const counters = { expects: 0, testCallbacks: 0, throwMatchers: 0, conditionalAliases: 0 };
  const findings = [];
  const files = [];
  for (const r of roots) walk(path.join(root, r), files);
  for (const file of files) scanFile(file, path.relative(root, file), counters, findings);
  return { files, findings, counters };
}

const FIXTURES = {
  "caught.test.ts": `
describe("caught", () => {
  it("A no assertion", () => { const x = 1; void x; });
  it("B tautology", () => { expect(true).toBe(true); });
  it("C conditional with vacuous else", () => {
    const wheres: unknown[] = [];
    if (wheres.length > 0) { expect(wheres).toContain("x"); } else { expect(true).toBe(true); }
  });
  it("D conditional with no else", () => {
    const spy = { mock: { calls: [] as unknown[] } };
    if (spy.mock.calls.length > 0) { expect(spy.mock.calls[0]).toBe(1); }
  });
  it("E floating rejects", () => { expect(Promise.reject(new Error())).rejects.toThrow(TypeError); });
  it.only("F focused", () => { expect(1).toBe(2); });
  it.skip("G suppressed", () => { expect(1).toBe(1); });
  it("H bare toThrow", () => { expect(() => boom()).toThrow(); });
  it("R early return above the assertions", () => {
    const found = ["a"].find((x) => x === "b");
    if (!found) return;
    expect(found).toContain("b");
  });
});
`,
  "not-caught.test.tsx": `
describe("not caught", () => {
  it("U sentinel: the guard itself is asserted by this sibling", () => {
    expect({ backendAvailable }).toEqual({ backendAvailable: true });
  });
  it("V sentinel-protected guard is NOT an escape hatch", () => {
    if (!backendAvailable) return;
    expect(catalog).toContain("x");
  });
  it("I throw is an assertion", () => {
    for (const s of items) if (!s.ok) throw new Error("bad " + s.key);
  });
  it("J guarded extra with real assertions outside the if", () => {
    const layout = { list: { columns: [] as unknown[] }, singular: "a" };
    expect(layout.singular).not.toBe("");
    if (layout.list.columns.length > 0) { expect(layout.list.columns[0]).toBeDefined(); }
  });
  it("K awaited rejects is fine", async () => {
    await expect(Promise.reject(new Error("z"))).rejects.toThrow(TypeError);
  });
  it("L negated bare toThrow cannot be satisfied by a crash", () => {
    expect(() => formatMoney("500.00")).not.toThrow();
  });
  it("M a named toThrow is fine", () => { expect(() => boom()).toThrow(TypeError); });
  xit("N xit is a suppression, not a vacuous test", () => { expect(1).toBe(1); });
  it("S a return BELOW the assertions silences nothing", () => {
    expect(1).toBe(1);
    if (!ready) return;
    expect(2).toBe(2);
  });
  it("T an early return with an else branch is a real two-way test", () => {
    if (!found) { expect(fallback).toBe(1); } else { expect(found).toBe(2); }
  });
});
`,
};

function selfTest() {
  const dir = fs.mkdtempSync(path.join(tmpdir(), "test-integrity-selftest-"));
  const specDir = path.join(dir, "app");
  fs.mkdirSync(specDir, { recursive: true });
  for (const [name, body] of Object.entries(FIXTURES))
    fs.writeFileSync(path.join(specDir, name), body);

  const { findings, counters, files } = scanTree(dir, ["app"]);
  const at = (file, title, cls) =>
    findings.some((f) => f.file.endsWith(file) && f.title === title && f.cls === cls);
  const none = (title, cls) => !findings.some((f) => f.title === title && f.cls === cls);

  const checks = [
    ["A is NO_ASSERTION", at("caught.test.ts", "A no assertion", "NO_ASSERTION")],
    ["B is TAUTOLOGY", at("caught.test.ts", "B tautology", "TAUTOLOGY")],
    ["C is COND_ASSERT", at("caught.test.ts", "C conditional with vacuous else", "COND_ASSERT")],
    ["D is COND_ASSERT", at("caught.test.ts", "D conditional with no else", "COND_ASSERT")],
    ["E is FLOATING_ASSERT", at("caught.test.ts", "E floating rejects", "FLOATING_ASSERT")],
    ["F is FOCUSED", at("caught.test.ts", "F focused", "FOCUSED")],
    ["G is SUPPRESSION", at("caught.test.ts", "G suppressed", "SUPPRESSION")],
    ["H is BARE_THROW", at("caught.test.ts", "H bare toThrow", "BARE_THROW")],
    ["a .tsx test file is scanned too", files.some((f) => f.endsWith(".tsx"))],
    [
      "the Build product module is NOT skipped as build output",
      !SKIP_DIRS.has("build") && !SKIP_DIRS.has("out"),
    ],
    ["I throw-as-assertion is NOT NO_ASSERTION", none("I throw is an assertion", "NO_ASSERTION")],
    [
      "J guarded extra with assertions outside is NOT COND_ASSERT",
      none("J guarded extra with real assertions outside the if", "COND_ASSERT"),
    ],
    ["K an awaited rejects is NOT FLOATING_ASSERT", none("K awaited rejects is fine", "FLOATING_ASSERT")],
    [
      "L .not.toThrow() is NOT BARE_THROW — a negated matcher fails on any throw",
      none("L negated bare toThrow cannot be satisfied by a crash", "BARE_THROW"),
    ],
    ["M toThrow(Class) is NOT BARE_THROW", none("M a named toThrow is fine", "BARE_THROW")],
    [
      "V a guard asserted by a SIBLING test is NOT EARLY_RETURN (sentinel)",
      none("V sentinel-protected guard is NOT an escape hatch", "EARLY_RETURN"),
    ],
    ["R is EARLY_RETURN", at("caught.test.ts", "R early return above the assertions", "EARLY_RETURN")],
    [
      "S a return BELOW the assertions is NOT EARLY_RETURN",
      none("S a return BELOW the assertions silences nothing", "EARLY_RETURN"),
    ],
    [
      "T an if/else is NOT EARLY_RETURN",
      none("T an early return with an else branch is a real two-way test", "EARLY_RETURN"),
    ],
    ["N xit is SUPPRESSION", at("not-caught.test.tsx", "N xit is a suppression, not a vacuous test", "SUPPRESSION")],
    [
      "N a suppressed test is NOT also counted as vacuous",
      none("N xit is a suppression, not a vacuous test", "NO_ASSERTION") &&
        none("N xit is a suppression, not a vacuous test", "TAUTOLOGY"),
    ],
    [
      "G a suppressed test is NOT also counted as vacuous",
      none("G suppressed", "TAUTOLOGY"),
    ],
    ["the fixture tree produced findings at all", findings.length > 0],
    ["every finding carries a class this gate knows", findings.every((f) => CLASSES.includes(f.cls))],
    ["every finding carries a line number", findings.every((f) => f.line > 0)],
    ["the .toThrow() matcher counted the fixture's throw matchers", counters.throwMatchers >= 3],
    ["the file-count floor would reject this fixture tree", files.length < MIN_SPEC_FILES],
    [
      "the test-callback floor would reject this fixture tree",
      counters.testCallbacks < MIN_TEST_CALLBACKS,
    ],
    ["the expect() floor would reject this fixture tree", counters.expects < MIN_EXPECTS],
    [
      "the throw-matcher floor would reject this fixture tree",
      counters.throwMatchers < MIN_THROW_MATCHERS,
    ],
  ];

  fs.rmSync(dir, { recursive: true, force: true });

  let failed = 0;
  for (const [name, ok] of checks) {
    if (!ok) {
      failed += 1;
      console.error(`  FAIL  ${name}`);
    }
  }
  console.log(`check-test-integrity self-test: ${checks.length - failed} passed, ${failed} failed`);
  return failed === 0 ? 0 : 1;
}

function inconclusive(msg) {
  console.error(`INCONCLUSIVE — ${msg}`);
  process.exit(2);
}

function main() {
  if (process.argv.includes("--self-test")) process.exit(selfTest());

  const roots = fs
    .readdirSync(PKG_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith("."))
    .map((e) => e.name);
  const { files, findings, counters } = scanTree(PKG_ROOT, roots);

  if (files.length < MIN_SPEC_FILES)
    inconclusive(
      `walked ${files.length} test files, below the floor of ${MIN_SPEC_FILES}. The scan did not reach the tree; this is not a clean result.`,
    );
  if (counters.testCallbacks < MIN_TEST_CALLBACKS)
    inconclusive(
      `parsed ${counters.testCallbacks} test callbacks, below the floor of ${MIN_TEST_CALLBACKS}. The test-callback matcher measured nothing.`,
    );
  if (counters.expects < MIN_EXPECTS)
    inconclusive(
      `saw ${counters.expects} expect() calls, below the floor of ${MIN_EXPECTS}. The assertion matcher measured nothing.`,
    );
  if (counters.throwMatchers < MIN_THROW_MATCHERS)
    inconclusive(
      `saw ${counters.throwMatchers} .toThrow() matchers, below the floor of ${MIN_THROW_MATCHERS}. The throw matcher measured nothing, so BARE_THROW 0 would be meaningless.`,
    );

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  const allowed = new Map(
    baseline.allowed.map((entry) => [`${entry.file}::${entry.title}::${entry.class}`, entry]),
  );

  if (process.argv.includes("--list"))
    for (const f of findings) console.log(`${f.cls}\t${f.file}:${f.line}\t${f.title}\t${f.detail}`);

  const seen = new Set();
  const unregistered = [];
  for (const f of findings) {
    const key = `${f.file}::${f.title}::${f.cls}`;
    if (allowed.has(key)) seen.add(key);
    else unregistered.push(f);
  }
  const stale = [...allowed.keys()].filter((k) => !seen.has(k));
  const counts = Object.fromEntries(
    CLASSES.map((c) => [c, findings.filter((f) => f.cls === c).length]),
  );

  console.log(
    `Test files ${files.length}  ·  test callbacks ${counters.testCallbacks}  ·  expect() calls ${counters.expects}  ·  .toThrow() matchers ${counters.throwMatchers}`,
  );
  console.log(
    `  ${CLASSES.map((c) => `${c.toLowerCase()} ${counts[c]}`).join("  ·  ")}  (registered ${baseline.allowed.length})`,
  );
  console.log(
    `  conditional suppression aliases ${counters.conditionalAliases} (INFO — runtime-selected, not ratcheted)`,
  );

  let rc = 0;
  if (unregistered.length > 0) {
    rc = 1;
    console.error(
      `\n${unregistered.length} test(s) in a class that cannot fail are not registered in ${path.relative(PKG_ROOT, BASELINE_PATH)}:`,
    );
    for (const f of unregistered)
      console.error(`  ${f.cls}  ${f.file}:${f.line}\n      "${f.title}"\n      ${f.detail}`);
    console.error(
      `\nGive the test a real assertion. Registering it instead requires a reason of at least ${baseline.minReasonLength} characters and a named owner, and every ratchet may only go down.`,
    );
  }
  if (stale.length > 0) {
    rc = 1;
    console.error(`\n${stale.length} registered entr(y/ies) no longer match anything — remove them:`);
    for (const k of stale) console.error(`  ${k}`);
  }
  for (const entry of baseline.allowed) {
    if (!entry.reason || entry.reason.length < baseline.minReasonLength) {
      rc = 1;
      console.error(
        `\nRegistered entry has no usable reason (min ${baseline.minReasonLength} chars): ${entry.file} :: ${entry.title}`,
      );
    }
    if (!entry.owner) {
      rc = 1;
      console.error(`\nRegistered entry has no owner: ${entry.file} :: ${entry.title}`);
    }
    if (!CLASSES.includes(entry.class)) {
      rc = 1;
      console.error(`\nRegistered entry names an unknown class '${entry.class}': ${entry.file}`);
    }
  }
  for (const cls of CLASSES) {
    const ratchet = baseline.ratchets[cls];
    if (typeof ratchet !== "number") {
      rc = 1;
      console.error(`\nNo ratchet declared for class ${cls}.`);
      continue;
    }
    if (counts[cls] > ratchet) {
      rc = 1;
      console.error(
        `\n${cls}: ${counts[cls]} site(s), ${counts[cls] - ratchet} above the ratchet of ${ratchet}.`,
      );
    }
  }

  if (rc === 0)
    console.log(
      `OK — every frontend test that runs can fail, and nothing is skipped. All seven ratchets are 0.`,
    );
  process.exit(rc);
}

main();
