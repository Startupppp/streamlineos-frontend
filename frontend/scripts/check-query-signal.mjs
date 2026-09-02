/**
 * check-query-signal.mjs
 *
 * Gate: every queryFn that calls a cancellable apiClient method must destructure
 * `signal` from its QueryFunctionContext AND pass it in that method's signal slot.
 *
 * Two blind spots in the original gate are closed here, both recorded in the PRD:
 *   1. It read a fixed 150-character window after `queryFn:`, so any multi-line
 *      body put the apiClient call out of scope. This parses the whole body.
 *   2. It only asked whether the body *mentioned* `signal`. `apiClient.get` is
 *      (url, params?, signal?), so `apiClient.get(url, signal)` mentioned it,
 *      scored compliant and cancelled nothing. This resolves every argument by
 *      POSITION and reports a signal sitting in a non-signal slot.
 *
 * Usage:
 *   node scripts/check-query-signal.mjs
 *   node scripts/check-query-signal.mjs --self-test
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKIP_DIRS = new Set(["node_modules", ".next", "feedbucket-widget", "scripts"]);
const EXTENSIONS = new Set([".ts", ".tsx"]);

/**
 * Argument index that carries the AbortSignal for each apiClient method.
 * `null` means the method has no signal slot at all, so a read using it inside a
 * queryFn cannot be cancelled and must be repaired rather than allowlisted.
 */
const SIGNAL_SLOT = {
  get: 2,
  post: 2,
  put: 2,
  patch: 2,
  delete: 2,
  download: null,
  upload: null,
};

/**
 * Legitimate exceptions: queryFns that cannot forward a signal. Add entries with
 * an explicit reason. Every entry is re-verified by the stale-entry check below.
 */
const ALLOWLIST = new Map([
  // ["hooks/api/path/to/file.ts", "reason: why signal cannot be forwarded"],
]);

function normRel(p) {
  return p.replace(/\\/g, "/");
}

function isTestFile(relPath) {
  const p = normRel(relPath);
  return (
    p.endsWith(".test.ts") ||
    p.endsWith(".test.tsx") ||
    p.endsWith(".spec.ts") ||
    p.endsWith(".spec.tsx") ||
    p.startsWith("test-utils/") ||
    p.includes("/__tests__/")
  );
}

/**
 * Walk `src` from `from`, tracking bracket depth while skipping string and
 * template literals. Calls `onChar(index, char, depth)`; stops when `onChar`
 * returns the string "stop". Returns the index it stopped at.
 */
const TYPE_ARG_START =
  /^\s*(?:[A-Z_$"'{[(]|(?:string|number|boolean|unknown|any|never|void|null|undefined|readonly|typeof|keyof|infer|extends)\b)/;

function scanBalanced(src, from, onChar) {
  let depth = 0;
  let angle = 0;
  let inStr = null;
  let esc = false;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (inStr) {
      if (c === "\\") esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      continue;
    }
    // `Record<string, unknown>` must not split on its comma. A type argument list
    // opens with `<` glued to an identifier and followed by something that starts a
    // type; `a < b` is followed by a lowercase value name, so comparisons are left alone.
    if (c === "<" && /[\w$>\]]/.test(src[i - 1] ?? "") && TYPE_ARG_START.test(src.slice(i + 1, i + 48))) {
      angle++;
      continue;
    }
    if (c === ">" && angle > 0 && src[i - 1] !== "=") {
      angle--;
      continue;
    }
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    if (onChar(i, c, depth, angle) === "stop") return i;
  }
  return src.length;
}

/** Split the arguments of the call whose opening paren sits at `open`. */
function splitCallArgs(src, open) {
  const args = [];
  let curStart = open + 1;
  let closed = false;
  scanBalanced(src, open, (i, c, depth, angle) => {
    if (depth === 0 && ")]}".includes(c)) {
      args.push(src.slice(curStart, i).trim());
      closed = true;
      return "stop";
    }
    if (depth === 1 && angle === 0 && c === ",") {
      args.push(src.slice(curStart, i).trim());
      curStart = i + 1;
    }
    return undefined;
  });
  return closed ? args : null;
}

/** Skip a balanced `<...>` type-argument list starting at `from`; returns the index after it. */
function skipTypeArgs(src, from) {
  if (src[from] !== "<") return from;
  let angle = 0;
  for (let i = from; i < src.length; i++) {
    if (src[i] === "<") angle++;
    else if (src[i] === ">") {
      angle--;
      if (angle === 0) return i + 1;
    } else if (src[i] === ";" || src[i] === "\n\n") return from;
  }
  return from;
}

/**
 * Locate every queryFn in `content` and return its parameter area and full body.
 * The body is the whole arrow body, however many lines it spans.
 */
function findQueryFnBlocks(content) {
  const blocks = [];
  const re = /\bqueryFn\s*:/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const afterColon = m.index + m[0].length;
    // The arrow that separates the parameter list from the body.
    let arrowIdx = -1;
    scanBalanced(content, afterColon, (i, c, depth) => {
      if (depth === 0 && c === "=" && content[i + 1] === ">") {
        arrowIdx = i;
        return "stop";
      }
      if (depth < 0) return "stop";
      return undefined;
    });
    if (arrowIdx === -1) continue;

    const paramArea = content.slice(afterColon, arrowIdx);
    let bodyStart = arrowIdx + 2;
    while (bodyStart < content.length && /\s/.test(content[bodyStart])) bodyStart++;

    let bodyEnd;
    if (content[bodyStart] === "{") {
      bodyEnd = scanBalanced(content, bodyStart, (i, c, depth) =>
        depth === 0 && c === "}" ? "stop" : undefined,
      );
    } else {
      bodyEnd = scanBalanced(content, bodyStart, (i, c, depth, angle) => {
        if (depth < 0) return "stop";
        if (depth === 0 && angle === 0 && c === ",") return "stop";
        return undefined;
      });
    }
    blocks.push({
      paramArea,
      body: content.slice(bodyStart, bodyEnd + 1),
      line: content.slice(0, m.index).split("\n").length,
    });
  }
  return blocks;
}

/** Every apiClient call inside a queryFn body, with its resolved arguments. */
function findApiCalls(body) {
  const calls = [];
  const re = /\bapiClient\.(\w+)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const method = m[1];
    if (!(method in SIGNAL_SLOT)) continue;
    let i = m.index + m[0].length;
    while (/\s/.test(body[i] ?? "")) i++;
    i = skipTypeArgs(body, i);
    while (/\s/.test(body[i] ?? "")) i++;
    if (body[i] !== "(") continue;
    const args = splitCallArgs(body, i);
    if (!args) continue;
    calls.push({ method, args: args.filter((a, idx) => a !== "" || idx === 0) });
  }
  return calls;
}

const MENTIONS_SIGNAL = /(^|[^\w$])signal\b/;

function findSignalViolations(content, relPath) {
  if (isTestFile(relPath)) return [];
  const norm = normRel(relPath);
  if (ALLOWLIST.has(norm)) return [];

  const violations = [];
  for (const block of findQueryFnBlocks(content)) {
    const calls = findApiCalls(block.body);
    if (calls.length === 0) continue;

    const noSlot = calls.filter((c) => SIGNAL_SLOT[c.method] === null);
    for (const c of noSlot)
      violations.push({
        loc: `${norm}:${block.line}`,
        kind: "NO_SIGNAL_SLOT",
        detail: `apiClient.${c.method} has no AbortSignal parameter, so this read cannot be cancelled`,
      });

    const cancellable = calls.filter((c) => SIGNAL_SLOT[c.method] !== null);
    if (cancellable.length === 0) continue;

    const paramHasSignal = /\bsignal\b/.test(block.paramArea);
    if (!paramHasSignal) {
      violations.push({
        loc: `${norm}:${block.line}`,
        kind: "MISSING_PARAM",
        detail: `queryFn calls apiClient.${cancellable[0].method} but does not destructure { signal }`,
      });
      continue;
    }

    for (const call of cancellable) {
      const slot = SIGNAL_SLOT[call.method];
      const wrong = call.args.findIndex(
        (a, i) => i !== slot && /^(signal|[A-Za-z_$][\w$]*\.signal)$/.test(a),
      );
      if (wrong !== -1) {
        violations.push({
          loc: `${norm}:${block.line}`,
          kind: "WRONG_SLOT",
          detail: `apiClient.${call.method} receives \`signal\` as argument ${wrong + 1}; the signal slot is argument ${slot + 1}`,
        });
        continue;
      }
      const forwarded =
        call.args.length > slot && MENTIONS_SIGNAL.test(call.args[slot] ?? "");
      if (!forwarded)
        violations.push({
          loc: `${norm}:${block.line}`,
          kind: "NOT_FORWARDED",
          detail: `apiClient.${call.method} does not receive \`signal\` in argument ${slot + 1}`,
        });
    }
  }
  return violations;
}

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (EXTENSIONS.has(extname(entry.name))) yield full;
  }
}

// ---------------------------------------------------------------------------
// Self-test — every fixture is a shape the previous gate scored as compliant.
// ---------------------------------------------------------------------------
function runSelfTest() {
  const longPreamble =
    "      const search = new URLSearchParams();\n" +
    "      if (filters.status) search.set('status', filters.status);\n" +
    "      if (filters.owner) search.set('owner', filters.owner);\n" +
    "      if (filters.from) search.set('from', filters.from);\n";

  const fixtures = [
    {
      description: "single-line queryFn, no signal destructured (BAD)",
      relPath: "hooks/api/bad-hook.ts",
      content: [
        "  return useQuery({",
        '    queryKey: ["things"],',
        "    queryFn: () =>",
        '      apiClient.get<string[]>("/things"),',
        "    staleTime: 30_000,",
        "  });",
      ].join("\n"),
      expect: ["MISSING_PARAM"],
    },
    {
      description: "async queryFn, no signal destructured (BAD)",
      relPath: "hooks/api/bad-async-hook.ts",
      content: [
        "    queryFn: async () =>",
        '      apiClient.get<string[]>("/things"),',
        "    staleTime: 30_000,",
      ].join("\n"),
      expect: ["MISSING_PARAM"],
    },
    {
      description: "signal in the params slot — the exact shape the old gate passed (BAD)",
      relPath: "hooks/api/wrong-slot-hook.ts",
      content: [
        "    queryFn: ({ signal }) =>",
        '      apiClient.get<string[]>("/things", signal),',
        "    staleTime: 30_000,",
      ].join("\n"),
      expect: ["WRONG_SLOT"],
    },
    {
      description: "multi-line body pushing the call past a 150-char window (BAD)",
      relPath: "hooks/api/long-body-hook.ts",
      content: [
        "    queryFn: async () => {",
        longPreamble,
        '      return apiClient.get<string[]>("/things?" + search.toString());',
        "    },",
      ].join("\n"),
      expect: ["MISSING_PARAM"],
    },
    {
      description: "multi-line body, signal destructured but never forwarded (BAD)",
      relPath: "hooks/api/long-body-unforwarded.ts",
      content: [
        "    queryFn: async ({ signal }) => {",
        longPreamble,
        '      return apiClient.get<string[]>("/things?" + search.toString());',
        "    },",
      ].join("\n"),
      expect: ["NOT_FORWARDED"],
    },
    {
      description: "apiClient.download inside a queryFn — no signal slot exists (BAD)",
      relPath: "hooks/api/download-hook.ts",
      content: [
        "    queryFn: ({ signal }) =>",
        '      apiClient.download("/exports/things", { format: "csv" }),',
        "    staleTime: 30_000,",
      ].join("\n"),
      expect: ["NO_SIGNAL_SLOT"],
    },
    {
      description: "apiClient.post search read without a signal in the config slot (BAD)",
      relPath: "hooks/api/bad-post-hook.ts",
      content: [
        '    queryFn: ({ signal }) => apiClient.post<string[]>("/things/search", {}),',
        "    staleTime: 30_000,",
      ].join("\n"),
      expect: ["NOT_FORWARDED"],
    },
    {
      description: "correct get with params and signal (GOOD)",
      relPath: "hooks/api/good-hook.ts",
      content: [
        "    queryFn: ({ signal }) =>",
        '      apiClient.get<string[]>("/things", undefined, signal),',
        "    staleTime: 30_000,",
      ].join("\n"),
      expect: [],
    },
    {
      description: "correct infinite query with pageParam and signal (GOOD)",
      relPath: "hooks/api/good-infinite-hook.ts",
      content: [
        "    queryFn: ({ pageParam, signal }) =>",
        '      apiClient.get<string[]>("/things", { cursor: pageParam }, signal),',
        "    initialPageParam: undefined,",
      ].join("\n"),
      expect: [],
    },
    {
      description: "correct multi-line body forwarding signal (GOOD)",
      relPath: "hooks/api/good-long-body.ts",
      content: [
        "    queryFn: async ({ signal }) => {",
        longPreamble,
        '      return apiClient.get<string[]>("/things", { q: search.toString() }, signal);',
        "    },",
      ].join("\n"),
      expect: [],
    },
    {
      description: "correct post with a RequestConfig carrying signal (GOOD)",
      relPath: "hooks/api/good-post.ts",
      content: [
        '    queryFn: ({ signal }) => apiClient.post<string[]>("/things/search", body, { signal }),',
      ].join("\n"),
      expect: [],
    },
    {
      description: "two calls in one body, only the second broken (BAD)",
      relPath: "hooks/api/two-calls.ts",
      content: [
        "    queryFn: async ({ signal }) => {",
        '      const a = await apiClient.get<string[]>("/a", undefined, signal);',
        '      const b = await apiClient.get<string[]>("/b", { id: a[0] });',
        "      return b;",
        "    },",
      ].join("\n"),
      expect: ["NOT_FORWARDED"],
    },
    {
      description: "template-literal path with braces does not break parsing (GOOD)",
      relPath: "hooks/api/template-path.ts",
      content: [
        "    queryFn: ({ signal }) =>",
        "      apiClient.get<string[]>(`/build/${projectId}/tickets/${ticketId}`, undefined, signal),",
      ].join("\n"),
      expect: [],
    },
    {
      description: "comma inside a `as Record<string, unknown>` cast is not an argument break (GOOD)",
      relPath: "hooks/api/cast-arg.ts",
      content: [
        "    queryFn: ({ signal }) =>",
        '      apiClient.get<PaginatedLeads>("/leads", filters as Record<string, unknown>, signal),',
      ].join("\n"),
      expect: [],
    },
    {
      description: "cast split across lines is still one argument (GOOD)",
      relPath: "hooks/api/multiline-cast.ts",
      content: [
        "    queryFn: ({ signal }) =>",
        '      apiClient.get<Holiday[]>("/hr/holidays", { year } as Record<',
        "        string,",
        "        unknown",
        "      >, signal),",
      ].join("\n"),
      expect: [],
    },
    {
      description: "a `<` comparison is not read as a type argument (BAD, still detected)",
      relPath: "hooks/api/comparison.ts",
      content: [
        "    queryFn: async ({ signal }) => {",
        "      const max = page < total ? page : total;",
        '      return apiClient.get<Row[]>("/rows", { max });',
        "    },",
      ].join("\n"),
      expect: ["NOT_FORWARDED"],
    },
    {
      description: "nested generic type argument does not hide the call (BAD)",
      relPath: "hooks/api/nested-generic.ts",
      content: [
        "    queryFn: ({ signal }) =>",
        '      apiClient.get<CursorResult<Row, string>>("/things", params),',
      ].join("\n"),
      expect: ["NOT_FORWARDED"],
    },
    {
      description: "signal passed as a POST body — the shape that sends the signal as JSON (BAD)",
      relPath: "hooks/api/post-signal-body.ts",
      content: [
        "    queryFn: ({ signal }) =>",
        "      apiClient.post<{ token: string }>(`/chat/channels/${id}/invite-link`, signal),",
      ].join("\n"),
      expect: ["WRONG_SLOT"],
    },
    {
      description: "test file — exempt regardless of content (GOOD)",
      relPath: "hooks/api/my-hook.test.ts",
      content: '    queryFn: () => apiClient.get<string[]>("/things"),',
      expect: [],
    },
  ];

  const failures = [];
  for (const { description, relPath, content, expect } of fixtures) {
    const kinds = findSignalViolations(content, relPath).map((v) => v.kind).sort();
    const want = [...expect].sort();
    if (JSON.stringify(kinds) !== JSON.stringify(want)) {
      failures.push(
        `self-test WRONG for "${description}": expected [${want.join(", ")}], got [${kinds.join(", ")}]`,
      );
    } else {
      console.log(
        `✔ self-test ${want.length ? `detected ${want.join("+")}` : "passed clean"}: ${description}`,
      );
    }
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`✖  ${f}`);
    process.exit(1);
  }
  console.log(`\n✔ ${fixtures.length} signal-gate fixtures passed — check-query-signal is live.`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------
const allViolations = [];
const seenAllowlisted = new Set();
let queryFnCount = 0;
let scannedFiles = 0;

for (const file of walkFiles(ROOT)) {
  const content = readFileSync(file, "utf8");
  const rel = normRel(relative(ROOT, file));
  if (!content.includes("queryFn")) continue;
  scannedFiles++;
  if (ALLOWLIST.has(rel)) seenAllowlisted.add(rel);
  if (!isTestFile(rel)) queryFnCount += findQueryFnBlocks(content).length;
  allViolations.push(...findSignalViolations(content, rel));
}

const SCAN_FLOOR = 300;
if (queryFnCount < SCAN_FLOOR) {
  console.error(
    `✖  scan floor not met — found only ${queryFnCount} queryFn blocks in ${scannedFiles} files ` +
      `(expected ≥${SCAN_FLOOR}). The parser is broken or the wrong tree was scanned.`,
  );
  process.exit(1);
}

const staleAllowlist = [...ALLOWLIST.keys()].filter((k) => !seenAllowlisted.has(k));
if (staleAllowlist.length > 0) {
  console.error(`✖  ${staleAllowlist.length} stale ALLOWLIST entr(y|ies):`);
  for (const k of staleAllowlist) console.error(`  ${k}`);
  process.exit(1);
}

console.log(`Parsed ${queryFnCount} queryFn blocks across ${scannedFiles} files.`);

if (allViolations.length === 0) {
  console.log("✔  No query-signal violations found.");
  process.exit(0);
}

const byKind = new Map();
for (const v of allViolations) byKind.set(v.kind, (byKind.get(v.kind) ?? 0) + 1);
console.error(`\n✖  ${allViolations.length} query-signal violation(s):`);
for (const [kind, count] of byKind) console.error(`   ${kind}: ${count}`);
console.error("");
for (const v of allViolations) console.error(`  [${v.kind}] ${v.loc} — ${v.detail}`);
console.error(
  "\nFix: destructure { signal } from QueryFunctionContext and pass it in the method's signal slot " +
    "(apiClient.get(url, params, signal); apiClient.post(url, body, { signal })).",
);
process.exit(1);
