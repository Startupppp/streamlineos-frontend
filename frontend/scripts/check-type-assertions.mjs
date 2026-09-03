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
 *     `.next-buildmart/dev/types/validator.ts`, a generated Next.js route-type
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

import { readdirSync, readFileSync } from "node:fs";
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
 * purpose: the package has carried both `.next/` and a 718 MB `.next-buildmart/`
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
  ["instrumentation.ts", { count: 1, seam: "external", invariant: "the dev-only Next instrumentation hook patches `globalThis.setTimeout` to clamp negative delays. setTimeout is an overload set whose return type differs between Node (Timeout) and the DOM (number), and no single function expression satisfies it. This site previously carried a `@ts-expect-error`, which blankets every error on the statement and — because the shipped detector counted suppressions with comments stripped — could never be seen by this gate at all. The cast names the one seam instead; `Object.setPrototypeOf(globalThis.setTimeout, orig)` on the next line restores the original's statics, and the whole function returns early outside development." }],

  // -- external: a browser global the DOM lib types nominally --
  ["feedbucket-widget/src/network-capture.ts", { count: 1, seam: "external", invariant: "installs a PatchedXHR subclass over `window.XMLHttpRequest`. `typeof XMLHttpRequest` is the DOM lib's constructor type including its static members, which a locally-declared subclass never satisfies nominally even when it satisfies it structurally. Monkey-patching a browser global is outside the type system by construction; the patch is feature-detected and the original constructor is retained for pass-through." }],

  // -- narrow-me: the generic record renderer wants an index signature --
  ["features/party/parties/parties-page.tsx", { count: 2, seam: "narrow-me", invariant: "`RecordValue` is `Record<string, unknown>` (features/renderer/format-value.tsx:15) and the layout-driven RecordList is typed against it. A declared interface such as BusinessParty has no implicit index signature in TypeScript, so it neither widens to RecordValue nor narrows back from it without a cast. Both sites are that one limitation: rows going in, and a row coming back out to PartyRowActions. The fix is a generic type parameter on the renderer, not a parse — the data never leaves the process between the two casts." }],
  ["features/party/parties/party-detail-sheet.tsx", { count: 1, seam: "narrow-me", invariant: "the same RecordValue index-signature seam as parties-page.tsx, widening a fetched party into the layout-driven RecordDetail. Same fix: a generic parameter on the renderer." }],
  ["features/party/parties/party-form-dialog.tsx", { count: 1, seam: "narrow-me", invariant: "the same RecordValue index-signature seam, widening form defaults into the layout-driven record form. Same fix: a generic parameter on the renderer." }],

  // -- narrow-me: a params object handed to a query-string builder --
  ["hooks/api/hr/employees.ts", { count: 1, seam: "narrow-me", invariant: "`FindExpertParams` is an interface of string and optional-string fields handed to apiClient.get's `Record<string, string>` query-parameter argument. An interface has no implicit index signature, and `department?: string` is `string | undefined`, so it cannot satisfy `Record<string, string>` either way. The honest fix is for the client to accept `Record<string, string | undefined>` and drop undefined keys when building the query string. Owned by the response-contracts lane, which holds hooks/api/**." }],
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
  ["features/build/forms/public-form-api.ts", { count: 1, seam: "external", invariant: "the error branch only: a failed public-form response is read for its `message` before being thrown as an Error. Read as `Record<string, unknown>` and every field is typeof-guarded before use. The SUCCESS branch of this file goes through `parseApiResponse` with `publicFormDefinitionContract`, which is what unwraps the envelope." }],
  ["features/build/intake/public-intake-api.ts", { count: 1, seam: "external", invariant: "the error branch only, same shape as public-form-api.ts: `Record<string, unknown>` with a typeof guard on every read. The success branch goes through `parseApiResponse` with `intakeSubmitResponseContract`." }],
  ["features/landing/contact-form.tsx", { count: 1, seam: "external", invariant: "an error-body probe on the public contact form. Errors are produced by the backend's exception filter, which does NOT pass through the response envelope, so there is nothing to unwrap; both fields are optional and fall back to a generic message. The success branch reads no body at all." }],
  ["hooks/api/ai-text-stream.ts", { count: 1, seam: "external", invariant: "an error-body probe on an SSE endpoint whose success path is a byte stream, not JSON — there is no envelope on the failure side and no body to parse on the success side. Every field is optional and defaults to the status line." }],
  ["hooks/api/sign/public.ts", { count: 2, seam: "external", invariant: "an unauthenticated e-sign surface that deliberately avoids apiClient so a signer's browser never touches the token cache. One site is the error-body probe; the other reads the success body as `unknown` and hands it to this file's own `unwrap()`, which checks `success === true && \"data\" in body` before returning `data`. The envelope IS handled; what is missing is a contract on the unwrapped value, which is `check:response-contracts` territory." }],
  ["lib/api-client.ts", { count: 2, seam: "external", invariant: "neither site talks to the backend API. One reads a 403 body for an ORG_MEMBERSHIP_* code, guarding `typeof body.code !== \"string\"` before use; the other reads Next's own `/api/auth/session` route, which is NextAuth's shape and carries no StreamlineOS envelope. Every backend response in this file goes through parseApiResponse instead." }],
  ["lib/auth-session.ts", { count: 3, seam: "external", invariant: "the server-side NextAuth bridge. Two sites read the body as `unknown` and pass it to this file's exported `unwrapBackend<T>()`, which checks `success === true && \"data\" in body` — the envelope is handled. The third reads the Google auth result with BOTH shapes declared optional (`data?.userId ?? userId`) precisely because it tolerates enveloped and bare bodies, and returns null when neither yields a userId." }],
  ["lib/portal-api-client.ts", { count: 2, seam: "external", invariant: "the customer-portal client, a second fetch seam with its own token store. Both sites are inside `parsePortalResponse`, which is this file's local equivalent of parseApiResponse: it reads the error body for message/code/details, and on success checks `success === true && \"data\" in body` before returning `data`. The envelope is handled; the value is not contracted." }],
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
  const promiseCasts = [];
  let files = 0;

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

    const jsonCasts = findRawJsonCasts(file, source);
    if (jsonCasts.length) rawJson.set(rel, jsonCasts.length);
    for (const site of jsonCasts)
      if (site.promiseCast) promiseCasts.push(`${rel}:${site.line} as ${site.target}`);
  }

  return { banned, doubleCasts, rawJson, promiseCasts, files };
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

function assert(cond, msg) {
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
  assert(".next-buildmart".startsWith(".next"),
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

  console.log("PASS: self-test (31 assertions + a written invariant on all "
    + `${DOUBLE_CAST_LEDGER.size + RAW_JSON_LEDGER.size} ledger entries)\n`);
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
    "  (j) `.next-buildmart` skipped like `.next`    -> generated output cannot enter the count",
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
  ]) console.log(line);
}

function main() {
  const { banned, doubleCasts, rawJson, promiseCasts, files } = scan(ROOT);

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

  const external = [...DOUBLE_CAST_LEDGER.values()].filter((e) => e.seam === "external").reduce((a, e) => a + e.count, 0);
  const narrowMe = [...DOUBLE_CAST_LEDGER.values()].filter((e) => e.seam === "narrow-me").reduce((a, e) => a + e.count, 0);

  console.log(`=== application files scanned: ${files} ===`);
  console.log(`=== \`as unknown as\`: ${total} site(s) in ${doubleCasts.size} file(s) ===`);
  console.log(`=== ledger: ${external} at a proven external seam, ${narrowMe} owed a narrowing ===`);
  console.log(`=== raw \`fetch\` JSON casts: ${rawJsonTotal} site(s) in ${rawJson.size} file(s) ===`);

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

  if (failed) process.exit(1);
  console.log("\nPASS: no forced-typing escape in application code, every double cast is ledgered at its recorded count, and every raw `fetch` JSON body is either read through parseApiResponse or ledgered with how it handles the envelope.");
}

if (process.argv.includes("--self-test")) runSelfTest();
else main();
