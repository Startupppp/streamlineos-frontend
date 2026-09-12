import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir, runScanDirSelfTest } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
/*
  `isExcludedScanDir` (check-repo-paths.mjs) skips every dot-directory, the
  `.next*` build outputs among them, plus node_modules and feedbucket-widget.
  scripts/ holds the gates themselves and stays out of their own corpus, as it
  was before the shared helper replaced this file's own list.
*/
const EXTRA_EXCLUDED_DIRS = new Set(["scripts"]);
const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);
const IMPORTS_API_CLIENT = /from ['"]@\/lib\/api-client['"]/;
const USECALLBACK_DECL = /(?:const|let)\s+(\w+)\s*=\s*useCallback\s*\(/g;
const DIRECT_ASYNC_EFFECT = /useEffect\s*\(\s*async\s*\(\s*\)\s*=>/;
const VOID_IN_EFFECT = /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*void\s+(\w+)\s*\(/g;
const USEEFFECT_OPEN = /useEffect\s*\(/g;
const API_CLIENT_CALL = /\bapiClient\s*\./;
const MIN_FILES = 5000;

/**
 * The callback bodies of every `useEffect(` in a file, brace-matched.
 *
 * Regex cannot do this: an effect body holds nested blocks, object literals and
 * arrow callbacks, and a `[^}]*` window stops at the first of them. Matching
 * braces is also what keeps the scan from running past the end of one effect
 * and into an unrelated `useQuery({ queryFn: () => apiClient.get(...) })`
 * below it, which would flag the correct pattern as the forbidden one.
 */
export function effectBodies(source) {
  const bodies = [];
  USEEFFECT_OPEN.lastIndex = 0;
  let match;
  while ((match = USEEFFECT_OPEN.exec(source)) !== null) {
    let i = match.index + match[0].length;
    let parens = 0;
    let start = -1;
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === "(") parens++;
      else if (c === ")") {
        if (parens === 0) break;
        parens--;
      } else if (c === "{") {
        start = i;
        break;
      }
    }
    if (start < 0) continue;
    let depth = 0;
    let end = start;
    for (; end < source.length; end++) {
      const c = source[end];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    bodies.push({ body: source.slice(start, end + 1), line: source.slice(0, match.index).split("\n").length });
  }
  return bodies;
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

export function scan(root) {
  const violations = [];
  let scannedFiles = 0;

  for (const file of walkFiles(root)) {
    scannedFiles++;
    const content = readFileSync(file, "utf8");
    if (!content.includes("useEffect") || !IMPORTS_API_CLIENT.test(content)) continue;

    const rel = relative(root, file);

    if (DIRECT_ASYNC_EFFECT.test(content) && content.includes("apiClient.")) {
      violations.push(`  ${rel}  (async useEffect with apiClient)`);
      continue;
    }

    const apiCallbacks = new Set();
    USECALLBACK_DECL.lastIndex = 0;
    let cbMatch;
    while ((cbMatch = USECALLBACK_DECL.exec(content)) !== null) {
      const name = cbMatch[1];
      const window = content.slice(cbMatch.index, cbMatch.index + 3000);
      if (window.includes("apiClient.")) apiCallbacks.add(name);
    }

    // Rule 3: a bare `apiClient.` call inside the effect body. This is the
    // CANONICAL shape of the thing the gate is named for --
    // `useEffect(() => { apiClient.get(...).then(setState); }, [dep])` -- and
    // until 2026-09-03 the scan could not see it: rule 1 needs an `async`
    // effect and rule 2 needs both a `useCallback` and a `void` call. The gate
    // reported "No useEffect-driven API fetches found" over one.
    for (const { body, line } of effectBodies(content)) {
      if (API_CLIENT_CALL.test(body)) violations.push(`  ${rel}:${line}  (apiClient call inside a useEffect body)`);
    }

    if (apiCallbacks.size === 0) continue;

    VOID_IN_EFFECT.lastIndex = 0;
    let voidMatch;
    while ((voidMatch = VOID_IN_EFFECT.exec(content)) !== null) {
      const calledFn = voidMatch[1];
      if (apiCallbacks.has(calledFn)) {
        const lineNum = content.slice(0, voidMatch.index).split("\n").length;
        violations.push(`  ${rel}:${lineNum}  ${voidMatch[0].trim()}`);
      }
    }
  }

  return { violations, scannedFiles };
}

function runSelfTest() {
  let passed = 0;
  const failures = [];
  const assert = (label, condition) => {
    if (condition) passed++;
    else failures.push(label);
  };

  const fixture = mkdtempSync(join(tmpdir(), "no-effect-fetches-"));
  try {
    mkdirSync(join(fixture, "features", "deep"), { recursive: true });
    mkdirSync(join(fixture, ".next-custom"), { recursive: true });

    writeFileSync(
      join(fixture, "features", "deep", "async-effect.tsx"),
      [
        'import { apiClient } from "@/lib/api-client";',
        "export function A() {",
        "  useEffect(async () => {",
        '    await apiClient.get("/things");',
        "  }, []);",
        "}",
      ].join("\n"),
    );

    writeFileSync(
      join(fixture, "void-callback.tsx"),
      [
        'import { apiClient } from "@/lib/api-client";',
        "export function B() {",
        "  const load = useCallback(async () => {",
        '    const r = await apiClient.get("/things");',
        "    setRows(r);",
        "  }, []);",
        "  useEffect(() => { void load(); }, [load]);",
        "}",
      ].join("\n"),
    );

    writeFileSync(
      join(fixture, "query-hook.tsx"),
      [
        'import { apiClient } from "@/lib/api-client";',
        "export function C() {",
        '  const { data } = useQuery({ queryKey: queryKeys.things.list(), queryFn: () => apiClient.get("/things") });',
        "  useEffect(() => { document.title = String(data?.length); }, [data]);",
        "}",
      ].join("\n"),
    );

    writeFileSync(
      join(fixture, "dom-effect.tsx"),
      [
        "export function D() {",
        "  const focus = useCallback(() => { ref.current?.focus(); }, []);",
        "  useEffect(() => { void focus(); }, [focus]);",
        "}",
      ].join("\n"),
    );

    writeFileSync(
      join(fixture, "direct-call.tsx"),
      [
        'import { apiClient } from "@/lib/api-client";',
        "export function E() {",
        "  useEffect(() => {",
        "    let cancelled = false;",
        '    apiClient.get("/search", { q }).then((d) => {',
        "      if (!cancelled) setRows(d.results);",
        "    });",
        "    return () => {",
        "      cancelled = true;",
        "    };",
        "  }, [q]);",
        "}",
      ].join("\n"),
    );

    writeFileSync(
      join(fixture, "effect-then-query.tsx"),
      [
        'import { apiClient } from "@/lib/api-client";',
        "export function F() {",
        "  useEffect(() => {",
        "    const opts = { capture: true };",
        "    document.addEventListener(\"keydown\", onKey, opts);",
        "    return () => document.removeEventListener(\"keydown\", onKey, opts);",
        "  }, [onKey]);",
        '  const { data } = useQuery({ queryKey: k, queryFn: () => apiClient.get("/things") });',
        "  return data;",
        "}",
      ].join("\n"),
    );

    writeFileSync(
      join(fixture, ".next-custom", "chunk.js"),
      'import{apiClient}from"@/lib/api-client";useEffect(async()=>{await apiClient.get("/x")},[]);',
    );

    const { violations, scannedFiles } = scan(fixture);
    const joined = violations.join("\n");

    assert("a known-bad async useEffect + apiClient is rejected", joined.includes("async-effect.tsx"));
    assert("the finding says why", joined.includes("async useEffect with apiClient"));
    assert("a voided useCallback that calls apiClient is rejected", joined.includes("void-callback.tsx"));
    assert("the voided-callback finding names a line", /void-callback\.tsx:\d+/.test(joined));
    assert("a useQuery hook with an unrelated effect is not a violation", !joined.includes("query-hook.tsx"));
    assert("a DOM-only effect is not a violation", !joined.includes("dom-effect.tsx"));
    assert("generated build output is outside the corpus", !joined.includes("chunk.js"));
    assert(
      "a bare apiClient call inside a useEffect body is rejected -- the canonical shape rules 1 and 2 both miss",
      joined.includes("direct-call.tsx"),
    );
    assert("the direct-call finding says why", joined.includes("apiClient call inside a useEffect body"));
    assert(
      "brace matching stops at the end of the effect: a DOM effect above a useQuery is NOT a violation",
      !joined.includes("effect-then-query.tsx"),
    );
    assert(
      "an effect body holding an object literal does not truncate the match",
      effectBodies('useEffect(() => { const o = { a: 1 }; apiClient.get("/x"); }, []);').length === 1,
    );
    assert(
      "an effect body holding an object literal is still searched to its end",
      API_CLIENT_CALL.test(effectBodies('useEffect(() => { const o = { a: 1 }; apiClient.get("/x"); }, []);')[0].body),
    );
    assert("exactly the three known-bad files are reported", violations.length === 3);
    assert("the vacuity floor would fire on this fixture", scannedFiles < MIN_FILES);
    runScanDirSelfTest(assert);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`\u2716  self-test FAILED: ${f}`);
    console.error(`check-no-effect-fetches self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-no-effect-fetches self-tests: ${passed} passed`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

const { violations, scannedFiles } = scan(ROOT);

if (scannedFiles < MIN_FILES) {
  console.error(`\u2716  Only ${scannedFiles} files scanned — the walk is broken, so a clean result would prove nothing.`);
  process.exit(1);
}

if (violations.length === 0) {
  console.log(`\u2714  No useEffect-driven API fetches found (${scannedFiles} files scanned).`);
  process.exit(0);
}
console.error(`\u2716  ${violations.length} useEffect-driven API fetch(es) — use useQuery or useMutation instead:`);
for (const v of violations) console.error(v);
process.exit(1);
