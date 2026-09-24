#!/usr/bin/env node
/**
 * Zero-growth ledger for forced typing in frontend application code.
 *
 * The backend half of this gate lives at
 * `streamlineos-backend/src/scripts/check-type-assertions.mjs`; this is the
 * frontend equivalent, deliberately the same shape so the two repositories
 * report the same thing in the same words.
 *
 * Shared CLAUDE.md section 6 says never force a type. Measured at head, the
 * frontend is already almost there: **zero `as any`, zero `@ts-ignore`, zero
 * `@ts-expect-error`, zero `@ts-nocheck`** in application code, and six
 * `as unknown as` sites in five files.
 *
 * Two circulating numbers are scanning errors, not findings, and this gate is
 * built so it cannot repeat either:
 *
 *   - the "661 `@ts-ignore`" figure is entirely inside
 *     `.next-custom/dev/types/validator.ts`, a generated Next.js route-type
 *     file. Every directory whose name begins `.next` is skipped below, so
 *     generated output can never enter the count.
 *   - a whole-tree grep also sweeps `coverage/` and the spec suite. Spec files
 *     are excluded here for the same reason the backend excludes them: the
 *     mock-construction idiom is a mocking-strategy decision, not hygiene.
 *
 * The gate has two rules:
 *
 *  1. **Hard zero** for `as any`, `@ts-ignore`, `@ts-expect-error` and
 *     `@ts-nocheck`. There is no ledger for these and no permitted count; the
 *     count is zero today and any reintroduction fails.
 *  2. **Zero growth** for `as unknown as`. Every file holding one is listed with
 *     its count, its seam and the invariant that makes the cast survivable. A
 *     new file, or an existing file gaining a site, fails. A file that *loses* a
 *     site also fails — with the new lower number to write down — so the ledger
 *     ratchets down and can never quietly hold a number that is no longer true.
 *
 * Flags:
 *   --self-test   Run the classifier against synthetic fixtures and exit.
 *   --list        Print the current per-file counts and exit 0. Use this to
 *                 produce the numbers a ledger update needs.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

/** A scan that suddenly finds nothing is far likelier to be broken than the tree clean. */
const SCAN_FLOOR_FILES = 3000;

/**
 * Patterns that appear in CODE. These are counted with comments stripped, so a
 * comment discussing a cast is never mistaken for one.
 */
const BANNED_IN_CODE = {
  "as any": /(?<![\w$])as\s+any(?![\w$])/g,
};

/**
 * Patterns that appear in COMMENTS, because that is the only place TypeScript
 * reads them. These MUST be matched in the raw source.
 *
 * This distinction is the whole reason the two groups exist. A suppression
 * directive is only ever written inside a `//` or a block comment, so counting
 * it "outside comments" makes the check structurally incapable of ever firing:
 * it reports zero on a file that opens with `// @ts-ignore`. That is a gate
 * reporting green over a set it cannot see, and it is the exact defect this
 * ledger exists to prevent — so it is asserted in the self-test, twice, in both
 * directions.
 *
 * Anchoring to the start of the comment is what keeps prose honest.
 * TypeScript only honours a directive that begins the comment, so
 * `// @ts-ignore` is a real suppression while `// we ship zero @ts-ignore` is a
 * sentence, and only the first matches.
 */
const BANNED_DIRECTIVES = {
  "@ts-ignore": /(?:\/\/|\/\*)\s*@ts-ignore\b/g,
  "@ts-expect-error": /(?:\/\/|\/\*)\s*@ts-expect-error\b/g,
  "@ts-nocheck": /(?:\/\/|\/\*)\s*@ts-nocheck\b/g,
};

const DOUBLE_CAST = /\bas\s+unknown\s+as\b/g;

/**
 * Generated, vendored and non-source trees. `.next*` is matched by prefix on
 * purpose: the package has carried both `.next/` and a 718 MB `.next-custom/`
 * alternate distDir, and it is the second one that produced the phantom 661
 * `@ts-ignore`. A future alternate distDir is caught by the same prefix.
 */
/**
 * Skipped ANYWHERE in the tree: these names never denote source.
 */
const SKIP_DIRS = new Set([
  "node_modules", "coverage", ".git", ".turbo", ".vercel", ".scratch", ".scan",
  "__tests__", "__mocks__",
]);

/**
 * Skipped ONLY at the package root, because these are build output *there* and
 * ordinary source everywhere else.
 *
 * This distinction is a correction, and it is the exact failure mode this
 * release keeps finding: a gate reporting green over a set it cannot see.
 * `build` was previously matched by NAME at any depth, which silently excluded
 * `features/build/` (456 files — the Build module is the product's largest),
 * `app/(authenticated)/build/`, `hooks/api/build/` and `lib/build/` from every
 * rule in this file. The gate said "4,260 application files, 0 escapes" over a
 * tree whose largest module was never opened. `public` and `dist` had the same
 * latent problem. The self-test pins the distinction in both directions.
 */
const SKIP_ROOT_DIRS = new Set(["dist", "build", "public", "out"]);
const SKIP_FILE = /(\.spec\.tsx?|\.test\.tsx?|\.d\.ts)$/;

/**
 * file -> { count, seam, invariant }
 *
 * `seam` is one of:
 *   external   — the value genuinely arrives from outside the type system and
 *                nothing inside it can describe the shape. Legitimate.
 *   narrow-me  — the value is ours and the shape is knowable. The cast stands
 *                in for a parse or a generic parameter that has not been
 *                written. Debt.
 */
const DOUBLE_CAST_LEDGER = new Map([
  // -- external: a platform global whose overload set no single function satisfies --
  ["instrumentation.ts", { count: 1, seam: "external", test: "scripts/__tests__/assertion-seam-contracts.test.ts::clamps a negative delay to zero instead of handing it to the platform", invariant: "the dev-only Next instrumentation hook patches `globalThis.setTimeout` to clamp negative delays. setTimeout is an overload set whose return type differs between Node (Timeout) and the DOM (number), and no single function expression satisfies it. This site previously carried a `@ts-expect-error`, which blankets every error on the statement and — because the shipped detector counted suppressions with comments stripped — could never be seen by this gate at all. The cast names the one seam instead; `Object.setPrototypeOf(globalThis.setTimeout, orig)` on the next line restores the original's statics, and the whole function returns early outside development." }],

  // -- external: a browser global the DOM lib types nominally --
  ["feedbucket-widget/src/network-capture.ts", { count: 1, seam: "external", test: "scripts/__tests__/assertion-seam-contracts.test.ts::installs a constructor that is still an XMLHttpRequest, and installs it once", invariant: "installs a PatchedXHR subclass over `window.XMLHttpRequest`. `typeof XMLHttpRequest` is the DOM lib's constructor type including its static members, which a locally-declared subclass never satisfies nominally even when it satisfies it structurally. Monkey-patching a browser global is outside the type system by construction; the patch is feature-detected and the original constructor is retained for pass-through." }],


]);

/**
 * ---------------------------------------------------------------------------
 * Rule 3: the raw-`fetch` JSON cast.
 * ---------------------------------------------------------------------------
 *
 * `check:response-contracts` (a separate gate, and the right home for it)
 * ratchets the 2,603 unparsed `apiClient` / `serverGet` / `publicGet` call
 * sites. It cannot see a raw `fetch`. A handful of surfaces deliberately do not
 * use `apiClient` — unauthenticated public pages that must not drag the token
 * cache or the auto-sign-out behaviour onto a page a stranger opens, the
 * NextAuth bridge, the customer portal client — and each of those reads its
 * body with `res.json()` and a cast. That cast is invisible to every gate in
 * either repository.
 *
 * It is not hypothetical. `app/(public)/forms/[token]/page.tsx` ended its read
 * with `return res.json() as Promise<PublicFormDefinition>`. The backend's
 * global ResponseTransformInterceptor wraps EVERY handler return as
 * `{ success: true, data }`, so the value that resolved was the envelope:
 * `form.name` was undefined, the header stayed on "Loading form…", and
 * `form.fields.length` threw. Two sibling sites carried the same cast. All
 * three now read through `parseApiResponse` with a Zod contract, pinned by
 * `features/build/forms/public-form-envelope.test.ts`.
 *
 * Two rules, and 3b is the one that bites:
 *
 *   3a. a per-file zero-growth ledger of every `x.json() as T`, each naming
 *       how that site handles the envelope. A new raw-`fetch` seam must be
 *       declared rather than added quietly.
 *   3b. HARD ZERO on `x.json() as Promise<T>`. `res.json()` already returns a
 *       promise, so casting the PROMISE — rather than the awaited body — can
 *       only be a success-payload read that skips both `unwrapEnvelope` and any
 *       contract. There is no legitimate form of it here. It was 3 before the
 *       fix above and is 0 now; no ledger, no permitted count.
 */
const RAW_JSON_LEDGER = new Map([
  ["features/build/intake/public-intake-api.ts", { count: 1, seam: "external", test: "scripts/__tests__/assertion-seam-contracts.test.ts::(negative) falls back to the generic message when the body's message is not a string or a string array", invariant: "the error branch only, same shape as public-form-api.ts: `Record<string, unknown>` with a typeof guard on every read. The success branch goes through `parseApiResponse` with `intakeSubmitResponseContract`." }],
]);

/**
 * Finds `<expr>.json() as T`, unwrapping parentheses and `await` so
 * `(await res.json()) as T` and `res.json() as Promise<T>` are both seen. A
 * regex cannot do this: the asserted type spans lines and nests angle brackets,
 * and the `.json()` sits behind an arbitrary receiver expression.
 */
export function findRawJsonCasts(fileName, source) {
  if (!source.includes(".json()")) return [];
  const sf = ts.createSourceFile(
    fileName, source, ts.ScriptTarget.Latest, true,
    /\.tsx$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found = [];
  const visit = (node) => {
    if (ts.isAsExpression(node)) {
      let inner = node.expression;
      while (ts.isParenthesizedExpression(inner) || ts.isAwaitExpression(inner))
        inner = inner.expression;
      if (
        ts.isCallExpression(inner) &&
        ts.isPropertyAccessExpression(inner.expression) &&
        inner.expression.name.getText(sf) === "json" &&
        inner.arguments.length === 0
      ) {
        const target = node.type.getText(sf).replace(/\s+/g, " ");
        found.push({
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          target,
          /** A cast of the PROMISE, not the awaited body. See rule 3b. */
          promiseCast: ts.isTypeReferenceNode(node.type)
            && node.type.typeName.getText(sf) === "Promise",
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);
  return found;
}

/**
 * ---------------------------------------------------------------------------
 * Rule 4: the plain `as X` cast and the non-null `!` assertion.
 * ---------------------------------------------------------------------------
 *
 * Rules 1-3 cover `as any`, the three suppression directives, `as unknown as`
 * and the raw-`fetch` JSON cast. Measured at head that is 20 assertions. The
 * census in `reports/51-assertion-census-and-the-envelope-cast.md` found the
 * rest, and the rest is the bulk of it: **925 plain `as X` casts and 77
 * non-null `!` assertions**. Every one is a type assertion in the plain meaning
 * of shared CLAUDE.md section 6 — "Never force types. No `as X`" — and until
 * this rule none was under any gate. The ledger was green over 2% of its own
 * subject.
 *
 * This rule does NOT ask for an invariant or a negative test per site; that bar
 * belongs to rules 2 and 3, whose populations are small enough to justify one
 * each. What it provides is the property the box needs and did not have: **the
 * population cannot grow.** A per-file ceiling seeded at the head count, which
 * fails when a file gains an assertion, when an unledgered file acquires one,
 * and equally when an entry outlives its site.
 *
 * What is counted, stated exactly:
 *
 *   counted      `x as T`, the angle-bracket form `<T>x` (0 today, counted so
 *                it cannot become the escape hatch), and `x!`.
 *   NOT counted  `x as const`. A const assertion NARROWS a literal to its own
 *                type; it cannot force one value to be a different one. It is
 *                the most common `as` in this tree by a wide margin (2,309
 *                sites) and folding it in would bury the signal under a safe
 *                idiom. Pinned by self-test (ab).
 *   NOT counted  `x satisfies T`, which checks rather than asserts.
 *   NOT counted  the `as unknown as` pair, which rule 2 owns with a written
 *                invariant each. Pinned by self-test (ac).
 *   NOT counted  a definite-assignment `let x!: T`, a declaration flag.
 *
 * The hole, named rather than left to be discovered: SKIP_FILE excludes every
 * `*.spec.ts(x)` and `*.test.ts(x)`. Specs are not typechecked at all here
 * (ts-jest runs `isolatedModules`), so a spec can forge any shape it likes and
 * nothing in this repository objects. That is deliberate and it is a gap.
 */
const CEILING_LEDGER_PATH = fileURLToPath(new URL("./assertion-ceiling-ledger.json", import.meta.url));

/**
 * A scan that suddenly matches nothing must fail rather than report a clean
 * tree. SCAN_FLOOR_FILES catches a broken walker; this catches a broken counter
 * walking a healthy tree.
 */
// Lowered 500 -> 499 on 2026-09-12: `lib/auth-session.ts` lost both of its
// assertions when `unwrapBackend<T>` stopped taking a type parameter and its two
// call sites narrowed through Zod instead. The tree really is one lower, so the
// tripwire moves with it rather than reporting a broken counter.
const CEILING_FLOOR_TOTAL = 498;

function loadCeilingLedger() {
  try {
    const raw = JSON.parse(readFileSync(CEILING_LEDGER_PATH, "utf8"));
    return new Map(Object.entries(raw.files ?? {}).map(([f, v]) => [f, { count: v.as + v.nonNull, as: v.as, nonNull: v.nonNull }]));
  } catch {
    return null;
  }
}

const CEILING_LEDGER = loadCeilingLedger() ?? new Map();

/**
 * Counts plain assertions with the AST, never a regex. A regex cannot tell
 * `as const` from `as Config`, cannot tell the two halves of `as unknown as`
 * apart from two independent casts, and reads `x! + y` and `a !== b` alike.
 */
export function countPlainAssertions(fileName, source) {
  const sf = ts.createSourceFile(
    fileName, source, ts.ScriptTarget.Latest, true,
    /\.tsx$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  let asX = 0;
  let nonNull = 0;
  let asConst = 0;

  const isConstAssertion = (t) =>
    ts.isTypeReferenceNode(t) && ts.isIdentifier(t.typeName) && t.typeName.escapedText === "const";

  const visit = (node) => {
    if (ts.isAsExpression(node)) {
      if (isConstAssertion(node.type)) asConst += 1;
      else if (node.type.kind === ts.SyntaxKind.UnknownKeyword && node.parent && ts.isAsExpression(node.parent)) {
        /* the inner half of `x as unknown as T`; rule 2 owns the pair */
      } else if (ts.isAsExpression(node.expression) && node.expression.type.kind === ts.SyntaxKind.UnknownKeyword) {
        /* the outer half of the same pair */
      } else asX += 1;
    } else if (ts.isTypeAssertionExpression(node)) asX += 1;
    else if (ts.isNonNullExpression(node)) nonNull += 1;
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);
  return { asX, nonNull, asConst };
}

function writeCeilingLedger(map) {
  const files = {};
  for (const f of [...map.keys()].sort()) files[f] = { as: map.get(f).as, nonNull: map.get(f).nonNull };
  writeFileSync(CEILING_LEDGER_PATH, `${JSON.stringify({
    note: "Rule 4 of check-type-assertions.mjs: a per-file ZERO-GROWTH ceiling on plain `as X` and non-null `!` assertions in application code. Seeded at the head count. It may only ever go DOWN: --update-ledger refuses to raise a number, and the gate fails both when a file gains an assertion and when an entry outlives its site. `as const` is excluded by decision (it narrows, it does not force). Specs are outside this gate entirely — see the rule 4 header.",
    files,
  }, null, 2)}\n`);
}

export function isSkippedDir(name, depth) {
  if (SKIP_DIRS.has(name) || name.startsWith(".next")) return true;
  return depth === 0 && SKIP_ROOT_DIRS.has(name);
}

function* walk(dir, depth = 0) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (isSkippedDir(entry.name, depth)) continue;
      yield* walk(join(dir, entry.name), depth + 1);
    } else if (/\.tsx?$/.test(entry.name) && !SKIP_FILE.test(entry.name)) {
      yield join(dir, entry.name);
    }
  }
}

/**
 * Counts occurrences outside line comments and block comments, so that a
 * comment *describing* a cast is never counted as one. This file's own header
 * would otherwise fail the gate it implements.
 */
export function countOutsideComments(source, pattern) {
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
  return [...stripped.matchAll(pattern)].length;
}

function scan(root) {
  const banned = new Map();
  const doubleCasts = new Map();
  const rawJson = new Map();
  const plain = new Map();
  const promiseCasts = [];
  let files = 0;
  let asConstTotal = 0;

  for (const file of walk(root)) {
    files += 1;
    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const rel = relative(root, file).replace(/\\/g, "/");
    for (const [name, pattern] of Object.entries(BANNED_IN_CODE)) {
      const n = countOutsideComments(source, pattern);
      if (n) banned.set(`${rel} :: ${name}`, n);
    }
    for (const [name, pattern] of Object.entries(BANNED_DIRECTIVES)) {
      const n = [...source.matchAll(pattern)].length;
      if (n) banned.set(`${rel} :: ${name}`, n);
    }
    const casts = countOutsideComments(source, DOUBLE_CAST);
    if (casts) doubleCasts.set(rel, casts);

    const { asX, nonNull, asConst } = countPlainAssertions(file, source);
    asConstTotal += asConst;
    if (asX || nonNull) plain.set(rel, { count: asX + nonNull, as: asX, nonNull });

    const jsonCasts = findRawJsonCasts(file, source);
    if (jsonCasts.length) rawJson.set(rel, jsonCasts.length);
    for (const site of jsonCasts)
      if (site.promiseCast) promiseCasts.push(`${rel}:${site.line} as ${site.target}`);
  }

  return { banned, doubleCasts, rawJson, plain, asConstTotal, promiseCasts, files };
}

export function diffLedger(actual, ledger) {
  const added = [];
  const grown = [];
  const shrunk = [];
  const gone = [];

  for (const [file, count] of actual) {
    const entry = ledger.get(file);
    if (!entry) added.push({ file, count });
    else if (count > entry.count) grown.push({ file, was: entry.count, now: count });
    else if (count < entry.count) shrunk.push({ file, was: entry.count, now: count });
  }
  for (const file of ledger.keys()) if (!actual.has(file)) gone.push(file);

  return { added, grown, shrunk, gone };
}

/**
 * Distinct self-test checks that actually executed, keyed by the `(tag)` each
 * assertion message opens with. A Set rather than a counter because several
 * checks run once per ledger entry — counting raw calls would make the floor
 * move with the ledger's size, which is exactly the kind of number that drifts
 * until it means nothing.
 */
const SELF_TEST_CHECKS = new Set();

/**
 * The self-test's OWN anti-vacuity floor.
 *
 * The line below used to print a hard-coded `31 assertions`. A self-test whose
 * headline number is a string literal reports the same number after someone
 * deletes half its assertions, which makes it decoration: the gate would still
 * exit 0 while proving strictly less. The count is now measured and floored, so
 * removing a check fails the self-test instead of quietly shrinking it.
 *
 * Raised 43 -> 47 when (ae)-(ah), C031's contract-test clause, were added. This
 * floor only ever moves UP: it is the one number in this file whose increase
 * makes the gate stricter rather than more permissive.
 */
const MIN_SELF_TEST_CHECKS = 47;

function assert(cond, msg) {
  const tag = /^\(([A-Za-z0-9]+)\)/.exec(msg);
  SELF_TEST_CHECKS.add(tag ? tag[1] : msg);
  if (!cond) {
    console.error("SELF-TEST FAIL:", msg);
    process.exit(1);
  }
}

function runSelfTest() {
  console.log("Running self-test...\n");

  assert(countOutsideComments("const a = b as unknown as C;\n", DOUBLE_CAST) === 1,
    "(a) a real double cast must be counted");
  assert(countOutsideComments("// explains an as unknown as cast\n", DOUBLE_CAST) === 0,
    "(b) a line comment describing a cast must NOT be counted — this gate's own header depends on it");
  assert(countOutsideComments("/**\n * an as unknown as cast\n */\n", DOUBLE_CAST) === 0,
    "(c) a block comment describing a cast must NOT be counted");
  assert(countOutsideComments("const url = 'https://x/y'; const a = b as unknown as C;\n", DOUBLE_CAST) === 1,
    "(d) a `//` inside a string must not blind the rest of the line");
  assert(countOutsideComments("const x = y as any;\n", BANNED_IN_CODE["as any"]) === 1,
    "(e) `as any` must be counted");
  assert(countOutsideComments("const x: Whereas anything = 1;\n", BANNED_IN_CODE["as any"]) === 0,
    "(f) `as any` must not match inside a longer identifier");

  // (g) and (h) are the two halves of the defect this gate shipped with on the
  // backend: suppression directives were counted with comments stripped, so the
  // check could never fire. (g) fails if that regression returns.
  const directiveHits = (src, name) => [...src.matchAll(BANNED_DIRECTIVES[name])].length;
  assert(countOutsideComments("// @ts-ignore\nconst x = 1;\n", /@ts-ignore/g) === 0,
    "(g) precondition: a comment-stripping counter CANNOT see a directive — which is why directives are matched raw");
  assert(directiveHits("// @ts-ignore\nconst x = 1;\n", "@ts-ignore") === 1
    && directiveHits("//@ts-ignore\n", "@ts-ignore") === 1
    && directiveHits("/* @ts-expect-error */\n", "@ts-expect-error") === 1
    && directiveHits("// @ts-nocheck\n", "@ts-nocheck") === 1,
    "(h) a real suppression directive MUST be caught, with or without a space, in a line or block comment");
  assert(directiveHits("// we ship zero @ts-ignore in application code\n", "@ts-ignore") === 0,
    "(i) prose mentioning a directive is not a directive — TypeScript only honours one that begins the comment");
  assert(".next-custom".startsWith(".next"),
    "(j) the generated-output skip must match an alternate distDir, not just `.next`");
  assert(isSkippedDir("build", 0) && isSkippedDir("public", 0) && isSkippedDir("dist", 0),
    "(j1) `build`/`public`/`dist` at the PACKAGE ROOT are output and must be skipped");
  assert(!isSkippedDir("build", 1) && !isSkippedDir("build", 2) && !isSkippedDir("public", 1),
    "(j2) a nested `build`/`public` is SOURCE and must be scanned — skipping it by name hid `features/build/` (456 files, the product's largest module) from every rule in this gate");
  assert(isSkippedDir("node_modules", 3) && isSkippedDir("__tests__", 4),
    "(j3) the always-skipped names stay skipped at every depth");

  const ledger = new Map([
    ["a.ts", { count: 2, seam: "external", invariant: "x" }],
    ["b.ts", { count: 1, seam: "external", invariant: "y" }],
    ["c.ts", { count: 1, seam: "external", invariant: "z" }],
  ]);
  const d = diffLedger(new Map([["a.ts", 3], ["b.ts", 1], ["d.ts", 1]]), ledger);
  assert(d.grown.length === 1 && d.grown[0].file === "a.ts",
    "(k) a file gaining a cast must be reported as growth");
  assert(d.added.length === 1 && d.added[0].file === "d.ts",
    "(l) a file not in the ledger must be reported as new");
  assert(d.gone.length === 1 && d.gone[0] === "c.ts",
    "(m) a ledgered file with no casts left must be reported so the entry is deleted");
  assert(diffLedger(new Map([["a.ts", 1]]), ledger).shrunk[0]?.now === 1,
    "(n) a file losing a cast must be reported with its new lower number");
  assert(diffLedger(new Map([["b.ts", 1]]), new Map([["b.ts", { count: 1 }]])).grown.length === 0,
    "(o) an unchanged file must not be reported");

  for (const [file, entry] of DOUBLE_CAST_LEDGER) {
    assert(entry.seam === "external" || entry.seam === "narrow-me",
      `(p) ${file}: seam must be "external" or "narrow-me", got "${entry.seam}"`);
    assert(typeof entry.invariant === "string" && entry.invariant.length > 40,
      `(q) ${file}: every entry needs a written invariant, not a placeholder`);
  }

  // ---- rule 3: the raw-`fetch` JSON cast --------------------------------
  const json = (src, name = "probe.ts") => findRawJsonCasts(name, src);

  assert(json("const b = (await res.json()) as Body;").length === 1,
    "(r) `(await res.json()) as T` must be found — parentheses and await are unwrapped");
  assert(json("const b = res.json() as Promise<Body>;").length === 1,
    "(s) `res.json() as Promise<T>` must be found");
  assert(json("const b = (await res.json()) as Body;")[0].promiseCast === false,
    "(t) casting the AWAITED body is ledgerable, not banned");
  assert(json("const b = res.json() as Promise<Body>;")[0].promiseCast === true,
    "(u) casting the PROMISE must be flagged — this is the public-form defect shape (gate bites)");
  assert(json("const b = await res.json();").length === 0,
    "(v) reading the body with NO cast is not a forced type and must not be counted");
  assert(json("const b = parseApiResponse(res, contract, path);").length === 0,
    "(w) the contracted read must not be counted — the fix must not look like the defect");
  assert(json("// const b = res.json() as Promise<Body>;\n").length === 0,
    "(x) a commented-out cast is not a cast — the AST does not see comments");
  assert(json("const b = json() as Body;").length === 0,
    "(y) a bare `json()` that is not a property access must not match");
  assert(json("const b = res.json(init) as Body;").length === 0,
    "(z) `.json(arg)` is somebody else's method, not Response.json()");
  assert(json("const b = (await res.json()) as {\n  a?: string;\n  b?: string;\n} ;")[0].target.includes("a?: string"),
    "(aa) a multi-line asserted type is read whole — the reason this rule is an AST and not a regex");

  for (const [file, entry] of RAW_JSON_LEDGER) {
    assert(entry.seam === "external" || entry.seam === "narrow-me",
      `(ab) ${file}: raw-JSON seam must be "external" or "narrow-me", got "${entry.seam}"`);
    assert(typeof entry.invariant === "string" && entry.invariant.length > 40,
      `(ac) ${file}: every raw-JSON entry needs a written invariant, not a placeholder`);
    assert(/envelope|success|Envelope/.test(entry.invariant),
      `(ad) ${file}: a raw-fetch invariant MUST say how the site handles the { success, data } envelope — that is the whole defect this rule exists for`);
  }

  // ---- C031's test clause, made enforceable ------------------------------
  // "Each exception must be … covered by a negative/runtime contract test."
  // That clause held on this side of the tree with ZERO mechanism: no entry
  // named a test, nothing checked that one existed, and the written invariants
  // were therefore comments. The backend gained this in an earlier wave and the
  // frontend did not, so the same criterion was enforced in one repository and
  // decorative in the other.
  //
  // A `narrow-me` entry is by its own label NOT a permitted exception, so the
  // requirement attaches to `external` — and demoting an entry is the only
  // escape, which moves a site from "proven seam" to "declared debt" rather
  // than lowering the bar. `features/landing/contact-form.tsx` took exactly
  // that route while these tests were written.
  const seenTestTargets = new Map();
  const narrowMeIsCleanDebt = (entry) => entry.test === undefined;
  const assertContractTest = (kind, file, entry) => {
    if (entry.seam !== "external") {
      assert(narrowMeIsCleanDebt(entry),
        `(ae) ${file}: a "narrow-me" ${kind} entry is declared debt, not a proven seam — it must NOT name a contract test`);
      return;
    }
    assert(typeof entry.test === "string" && /^[^:]+\.(test|spec)\.tsx?::.+$/.test(entry.test),
      `(af) ${file}: every EXTERNAL ${kind} entry must name its contract test as "<spec path>::<test title>" — C031 permits an assertion only where one exists`);
    const [specPath, title] = entry.test.split("::");
    let specSource = seenTestTargets.get(specPath);
    if (specSource === undefined) {
      try {
        specSource = readFileSync(join(ROOT, specPath), "utf8");
      } catch {
        specSource = null;
      }
      seenTestTargets.set(specPath, specSource);
    }
    assert(specSource !== null,
      `(ag) ${file}: names ${specPath}, which is not on disk. A ledger that points at a deleted spec proves nothing`);
    assert(typeof specSource === "string" && specSource.includes(title),
      `(ah) ${file}: ${specPath} does not contain the test titled "${title}" — renaming or deleting a contract test must fail here, not silently un-cover the cast`);
  };
  for (const [file, entry] of DOUBLE_CAST_LEDGER) assertContractTest("double-cast", file, entry);
  for (const [file, entry] of RAW_JSON_LEDGER) assertContractTest("raw-JSON", file, entry);

  assertContractTest("double-cast", "[self-test-fixture]", {
    count: 1,
    seam: "narrow-me",
    invariant: "synthetic fixture — a narrow-me entry is declared debt, not a proven seam, and must carry no contract test",
  });

  assert(narrowMeIsCleanDebt({ seam: "narrow-me" })
      && !narrowMeIsCleanDebt({ seam: "narrow-me", test: "a.test.ts::t" }),
    "(ae2) (ae)'s predicate accepts a bare narrow-me entry and REJECTS one naming a contract test — the fixture above only walks the accepting half");

  const plainOf = (src) => countPlainAssertions("probe.ts", src);

  assert(plainOf("const a = b as Config;\n").asX === 1,
    "(ba) a plain `as X` cast -> counted by rule 4");
  assert(plainOf("const a = { x: 1 } as const;\n").asX === 0
    && plainOf("const a = { x: 1 } as const;\n").asConst === 1,
    "(bb) `as const` -> NOT a type assertion, counted separately and never against the ceiling");
  assert(plainOf("const a = b as unknown as C;\n").asX === 0,
    "(bc) `as unknown as` -> owned by rule 2, never double-ledgered into the ceiling");
  assert(plainOf("const a = b!.c;\n").nonNull === 1,
    "(bd) a non-null `!` assertion -> counted");
  assert(plainOf("const a = a !== b;\n").nonNull === 0,
    "(be) an inequality operator -> not a non-null assertion (why this rule is an AST, not a regex)");
  assert(plainOf("const a = <Config>b;\n").asX === 1,
    "(bf) the angle-bracket cast form -> counted, so it cannot become the escape hatch");
  assert(plainOf("const a = b satisfies Config;\n").asX === 0,
    "(bg) `satisfies` -> a check, not an assertion, not counted");
  assert(plainOf("class K { declare x!: string; }\n").nonNull === 0,
    "(bh) a definite-assignment declaration -> a declaration flag, not an expression assertion");
  assert(CEILING_LEDGER.size > 0,
    "(bi) the ceiling ledger loads — rule 4 is unenforced if the JSON is missing, and the gate must not pass without it");
  for (const [file, entry] of CEILING_LEDGER) {
    assert(Number.isInteger(entry.as) && Number.isInteger(entry.nonNull) && entry.count === entry.as + entry.nonNull,
      `(bj) ${file}: every ceiling entry carries a readable as/nonNull split`);
  }

  if (SELF_TEST_CHECKS.size < MIN_SELF_TEST_CHECKS) {
    console.error(
      `\nSELF-TEST FAIL: only ${SELF_TEST_CHECKS.size} distinct check(s) ran, below the floor of `
      + `${MIN_SELF_TEST_CHECKS}. A self-test that stops asserting must fail loudly, not report a `
      + `smaller number. Ran: ${[...SELF_TEST_CHECKS].join(", ")}`,
    );
    process.exit(1);
  }

  console.log(`PASS: self-test (${SELF_TEST_CHECKS.size} distinct checks, floor `
    + `${MIN_SELF_TEST_CHECKS} + a written invariant on all `
    + `${DOUBLE_CAST_LEDGER.size + RAW_JSON_LEDGER.size} invariant-bearing ledger entries, and a `
    + `ceiling on all ${CEILING_LEDGER.size} files holding a plain assertion)\n`);
  for (const line of [
    "  (a) a real double cast                        -> counted",
    "  (b) a line comment describing one             -> not counted",
    "  (c) a block comment describing one            -> not counted",
    "  (d) a `//` inside a string                    -> does not blind the line",
    "  (e) `as any`                                  -> counted",
    "  (f) `as any` inside a longer identifier       -> not counted",
    "  (g) comment-stripping CANNOT see a directive  -> why directives are matched raw",
    "  (h) a real @ts-ignore/-expect-error/-nocheck  -> caught (gate bites)",
    "  (i) prose mentioning a directive              -> not a directive",
    "  (j) `.next-custom` skipped like `.next`    -> generated output cannot enter the count",
    "  (j1) root `build`/`public`/`dist`              -> skipped (output)",
    "  (j2) NESTED `build`/`public`                   -> scanned (source; this was the blind spot)",
    "  (j3) node_modules/__tests__ at any depth       -> skipped",
    "  (k) a file gaining a cast                     -> growth (gate bites)",
    "  (l) a file absent from the ledger             -> new (gate bites)",
    "  (m) a ledgered file with no casts left        -> stale (gate bites)",
    "  (n) a file losing a cast                      -> reported with the new number",
    "  (o) an unchanged file                         -> silent",
    "  (p) every ledger entry names a seam kind",
    "  (q) every ledger entry carries a written invariant",
    "  (r) `(await res.json()) as T`                 -> found",
    "  (s) `res.json() as Promise<T>`                -> found",
    "  (t) casting the AWAITED body                  -> ledgerable",
    "  (u) casting the PROMISE                       -> banned (gate bites)",
    "  (v) reading the body with no cast             -> not counted",
    "  (w) `parseApiResponse(res, contract, path)`   -> not counted (the fix is not the defect)",
    "  (x) a commented-out cast                      -> not counted",
    "  (y) a bare `json()`                           -> not matched",
    "  (z) `.json(arg)`                              -> somebody else's method",
    "  (aa) a multi-line asserted type               -> read whole (why this rule is an AST)",
    "  (ab) every raw-JSON entry names a seam kind",
    "  (ac) every raw-JSON entry carries a written invariant",
    "  (ad) every raw-JSON invariant states its envelope handling",
    "  (ae) a narrow-me entry names NO contract test  -> debt cannot masquerade as a proven seam",
    "  (af) every EXTERNAL entry names one as path::title",
    "  (ag) the named spec file is on disk             -> a dead pointer fails (gate bites)",
    "  (ah) the named test title is IN that file       -> a rename fails (gate bites)",
    "  (ba) a plain `as X`                            -> counted (rule 4)",
    "  (bb) `as const`                                -> excluded by decision",
    "  (bc) `as unknown as`                           -> rule 2's, not double-ledgered",
    "  (bd) a non-null `!`                            -> counted",
    "  (be) an inequality `!==`                       -> not a non-null assertion",
    "  (bf) the angle-bracket cast `<T>x`             -> counted",
    "  (bg) `satisfies`                               -> not counted",
    "  (bh) a definite-assignment `x!: T`             -> not counted",
    "  (bi) the ceiling ledger loads at all",
    "  (bj) every ceiling entry has a readable split",
  ]) console.log(line);
}

function main() {
  const { banned, doubleCasts, rawJson, plain, asConstTotal, promiseCasts, files } = scan(ROOT);

  if (files < SCAN_FLOOR_FILES) {
    console.error(`FAIL: scanned only ${files} file(s), below the floor of ${SCAN_FLOOR_FILES}. The scan is broken, not the tree clean.`);
    process.exit(1);
  }

  const total = [...doubleCasts.values()].reduce((a, b) => a + b, 0);

  const rawJsonTotal = [...rawJson.values()].reduce((a, b) => a + b, 0);

  if (process.argv.includes("--list")) {
    for (const [file, count] of [...doubleCasts].sort()) console.log(`${count}\t${file}`);
    console.log(`\n${files} application files, ${doubleCasts.size} with a double cast, ${total} sites.`);
    console.log("\n--- rule 3: raw `fetch` JSON casts ---");
    for (const [file, count] of [...rawJson].sort()) console.log(`${count}\t${file}`);
    console.log(`\n${rawJson.size} file(s), ${rawJsonTotal} site(s), ${promiseCasts.length} of them a banned Promise cast.`);
    return;
  }

  const plainTotal = [...plain.values()].reduce((a, v) => a + v.count, 0);
  const plainAs = [...plain.values()].reduce((a, v) => a + v.as, 0);
  const plainNonNull = [...plain.values()].reduce((a, v) => a + v.nonNull, 0);

  if (process.argv.includes("--seed-ledger")) {
    if (CEILING_LEDGER.size) {
      console.error("REFUSED: assertion-ceiling-ledger.json already exists. Seeding again would erase the ratchet. Use --update-ledger, which can only lower.");
      process.exit(1);
    }
    writeCeilingLedger(plain);
    console.log(`Seeded ${plain.size} file(s), ${plainTotal} assertion(s).`);
    return;
  }

  if (process.argv.includes("--update-ledger")) {
    const raised = [...plain].filter(([f, v]) => !CEILING_LEDGER.has(f) || v.count > CEILING_LEDGER.get(f).count);
    if (raised.length) {
      console.error(`REFUSED: --update-ledger only ever LOWERS. ${raised.length} file(s) would go up, which is the growth this gate exists to stop. Remove the assertion instead:`);
      for (const [f, v] of raised) console.error(`  ${f}: ledger ${CEILING_LEDGER.get(f)?.count ?? "(absent)"} -> tree ${v.count}`);
      process.exit(1);
    }
    writeCeilingLedger(plain);
    console.log(`Lowered the ceiling to ${plain.size} file(s), ${plainTotal} assertion(s).`);
    return;
  }

  const external = [...DOUBLE_CAST_LEDGER.values()].filter((e) => e.seam === "external").reduce((a, e) => a + e.count, 0);
  const narrowMe = [...DOUBLE_CAST_LEDGER.values()].filter((e) => e.seam === "narrow-me").reduce((a, e) => a + e.count, 0);

  console.log(`=== application files scanned: ${files} ===`);
  console.log(`=== \`as unknown as\`: ${total} site(s) in ${doubleCasts.size} file(s) ===`);
  console.log(`=== ledger: ${external} at a proven external seam, ${narrowMe} owed a narrowing ===`);
  const externalEntries = [...DOUBLE_CAST_LEDGER, ...RAW_JSON_LEDGER].filter(([, e]) => e.seam === "external");
  const covered = externalEntries.filter(([, e]) => typeof e.test === "string" && e.test.length > 0).length;
  console.log(`=== C031 contract tests: ${covered}/${externalEntries.length} external entr(ies) across both ledgers name a negative/runtime test (self-test (ae)-(ah) proves each one exists and still bears that title) ===`);
  console.log(`=== raw \`fetch\` JSON casts: ${rawJsonTotal} site(s) in ${rawJson.size} file(s) ===`);
  console.log(`=== plain assertions under a zero-growth ceiling: ${plainTotal} (${plainAs} \`as X\` + ${plainNonNull} non-null \`!\`) in ${plain.size} file(s) ===`);
  console.log(`=== \`as const\` excluded by decision (a const assertion narrows, it does not force): ${asConstTotal} ===`);

  let failed = false;

  if (banned.size) {
    console.error(`\nFAIL: ${banned.size} forced-typing escape(s) in application code — these have no ledger and no permitted count:`);
    for (const [where, n] of banned) console.error(`  ${where} x${n}`);
    failed = true;
  } else {
    console.log("=== as any / @ts-ignore / @ts-expect-error / @ts-nocheck: 0 ===");
  }

  const { added, grown, shrunk, gone } = diffLedger(doubleCasts, DOUBLE_CAST_LEDGER);

  if (added.length) {
    console.error(`\nFAIL: ${added.length} file(s) hold a double cast and are not in DOUBLE_CAST_LEDGER. Narrow it, or add an entry naming the seam and the invariant:`);
    for (const { file, count } of added) console.error(`  ${file} (${count} site(s))`);
    failed = true;
  }
  if (grown.length) {
    console.error(`\nFAIL: ${grown.length} file(s) gained a double cast. The ledger does not grow:`);
    for (const { file, was, now } of grown) console.error(`  ${file}: ${was} -> ${now}`);
    failed = true;
  }
  if (shrunk.length || gone.length) {
    console.error(`\nFAIL: ${shrunk.length + gone.length} ledger entr(ies) are out of date — the ratchet only ratchets down, so write the new number:`);
    for (const { file, was, now } of shrunk) console.error(`  ${file}: ledger says ${was}, tree has ${now} — lower the entry`);
    for (const file of gone) console.error(`  ${file}: no casts left — delete the entry`);
    failed = true;
  }

  const raw = diffLedger(rawJson, RAW_JSON_LEDGER);
  if (raw.added.length) {
    console.error(`\nFAIL: ${raw.added.length} file(s) cast a raw \`fetch\` JSON body and are not in RAW_JSON_LEDGER. Read through \`parseApiResponse\` with a contract, or add an entry saying how this site handles the { success, data } envelope:`);
    for (const { file, count } of raw.added) console.error(`  ${file} (${count} site(s))`);
    failed = true;
  }
  if (raw.grown.length) {
    console.error(`\nFAIL: ${raw.grown.length} file(s) gained a raw JSON cast. The ledger does not grow:`);
    for (const { file, was, now } of raw.grown) console.error(`  ${file}: ${was} -> ${now}`);
    failed = true;
  }
  if (raw.shrunk.length || raw.gone.length) {
    console.error(`\nFAIL: ${raw.shrunk.length + raw.gone.length} raw-JSON ledger entr(ies) are out of date — write the new number:`);
    for (const { file, was, now } of raw.shrunk) console.error(`  ${file}: ledger says ${was}, tree has ${now} — lower the entry`);
    for (const file of raw.gone) console.error(`  ${file}: no raw JSON cast left — delete the entry`);
    failed = true;
  }

  if (promiseCasts.length) {
    console.error(`\nFAIL: ${promiseCasts.length} site(s) cast the PROMISE returned by .json() instead of the awaited body. That can only be a success-payload read that skips both the { success, data } envelope and any contract — it is exactly what left the public form page rendering "Loading form…" and throwing on \`form.fields.length\`. There is no ledger for this:`);
    for (const where of promiseCasts) console.error(`  ${where}`);
    failed = true;
  } else {
    console.log("=== `.json() as Promise<T>` (the public-form defect shape): 0 ===");
  }

  if (!CEILING_LEDGER.size) {
    console.error("\nFAIL: assertion-ceiling-ledger.json is missing or unreadable. Rule 4 is unenforced without it; a gate that cannot find its ledger must not pass.");
    failed = true;
  } else if (plainTotal < CEILING_FLOOR_TOTAL) {
    console.error(`\nFAIL: rule 4 counted only ${plainTotal} plain assertion(s), below the floor of ${CEILING_FLOOR_TOTAL}. The counter is broken, not the tree clean.`);
    failed = true;
  }

  const ceiling = diffLedger(new Map([...plain].map(([f, v]) => [f, v.count])), CEILING_LEDGER);
  if (ceiling.added.length) {
    console.error(`\nFAIL: ${ceiling.added.length} file(s) hold a plain \`as X\` or non-null \`!\` assertion and are not in the ceiling ledger. CLAUDE.md section 6 says never force a type — narrow at the use site, or the assertion does not land:`);
    for (const { file, count } of ceiling.added) console.error(`  ${file} (${count} assertion(s))`);
    failed = true;
  }
  if (ceiling.grown.length) {
    console.error(`\nFAIL: ${ceiling.grown.length} file(s) gained a plain assertion. The ceiling does not rise:`);
    for (const { file, was, now } of ceiling.grown) console.error(`  ${file}: ${was} -> ${now}`);
    failed = true;
  }
  if (ceiling.shrunk.length || ceiling.gone.length) {
    console.error(`\nFAIL: ${ceiling.shrunk.length + ceiling.gone.length} ceiling entr(ies) are stale — an exception that outlives its site is how the next reader inherits a licence nobody meant to grant. Run \`pnpm check:type-assertions --update-ledger\`, which can only lower:`);
    for (const { file, was, now } of ceiling.shrunk) console.error(`  ${file}: ledger ${was}, tree ${now} — lower it`);
    for (const file of ceiling.gone) console.error(`  ${file}: no plain assertion left — delete the entry`);
    failed = true;
  }

  if (failed) process.exit(1);
  console.log("\nPASS: no forced-typing escape in application code, every double cast is ledgered at its recorded count, and every raw `fetch` JSON body is either read through parseApiResponse or ledgered with how it handles the envelope.");
}

if (process.argv.includes("--self-test")) runSelfTest();
else main();
