import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isExcludedScanDir } from "./check-repo-paths.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXTENSIONS = new Set([".ts", ".tsx"]);

const UNKNOWN_PARAM_CEILING = 0;
const MIN_CALL_SITES = 400;

function normRel(relPath) {
  return relPath.replace(/\\/g, "/");
}

function isTestFile(relPath) {
  const p = normRel(relPath);
  return p.endsWith(".test.ts") || p.endsWith(".test.tsx") || p.includes("/__tests__/") || p.startsWith("test-utils/");
}

function normalizeRoute(p) {
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  return withSlash
    .split("/")
    .map((seg) => (seg.startsWith("{") || seg === "*" ? "*" : seg))
    .join("/");
}

export function declaredQueryParams(document) {
  const byRoute = new Map();
  for (const [path, methods] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!operation || typeof operation !== "object") continue;
      const names = new Set(
        (operation.parameters ?? []).filter((p) => p.in === "query").map((p) => p.name),
      );
      byRoute.set(`${method.toUpperCase()} ${normalizeRoute(path)}`, names);
    }
  }
  return byRoute;
}

// Quote-aware: `{ types: "BIRTHDAY,ANNIVERSARY" }` must not read as two keys.
export function topLevelKeys(body) {
  const entries = [];
  let depth = 0;
  let quote = null;
  let buffer = "";
  for (const ch of body) {
    if (quote) {
      buffer += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      buffer += ch;
      continue;
    }
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    if (ch === ")" || ch === "}" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      entries.push(buffer);
      buffer = "";
      continue;
    }
    buffer += ch;
  }
  entries.push(buffer);

  const keys = [];
  let sawSpread = false;
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("...")) {
      sawSpread = true;
      continue;
    }
    const name = trimmed.split(":")[0].trim().replace(/^["'`]|["'`]$/g, "");
    if (/^[A-Za-z_$][\w$]*$/.test(name)) keys.push(name);
  }
  return { keys, sawSpread };
}

function readArguments(source, openParen) {
  const args = [];
  let depth = 0;
  let quote = null;
  let buffer = "";
  for (let i = openParen; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      buffer += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      buffer += ch;
      continue;
    }
    if (ch === "(" || ch === "{" || ch === "[") {
      depth++;
      if (depth === 1) continue;
    } else if (ch === ")" || ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) {
        args.push(buffer);
        return args;
      }
    }
    if (depth === 1 && ch === ",") {
      args.push(buffer);
      buffer = "";
      continue;
    }
    buffer += ch;
  }
  return null;
}

const CALL_RE = /apiClient\.(get|delete)\s*(?:<[^;()]*?>)?\s*\(/g;

export function scanSource(source, relPath, byRoute) {
  const findings = [];
  let unresolved = 0;
  let compared = 0;
  CALL_RE.lastIndex = 0;
  let match;
  while ((match = CALL_RE.exec(source))) {
    const method = match[1].toUpperCase();
    const openParen = match.index + match[0].length - 1;
    const args = readArguments(source, openParen);
    if (!args || args.length < 2) continue;

    const rawPath = args[0].trim();
    if (!/^["'`]/.test(rawPath)) continue;
    const literalPath = rawPath.slice(1, -1).replace(/\$\{[^}]*\}/g, "*");
    const allowed = byRoute.get(`${method} ${normalizeRoute(literalPath)}`);
    if (!allowed) continue;

    const params = args[1].trim();
    if (params === "undefined" || params === "") continue;
    if (!params.startsWith("{")) {
      unresolved++;
      continue;
    }

    compared++;
    const body = params.slice(1, params.lastIndexOf("}"));
    const { keys, sawSpread } = topLevelKeys(body);
    if (sawSpread) unresolved++;
    for (const key of keys) {
      if (allowed.has(key)) continue;
      const line = source.slice(0, match.index).split("\n").length;
      findings.push({
        file: normRel(relPath),
        line,
        route: `${method} ${normalizeRoute(literalPath)}`,
        key,
        allowed: [...allowed],
      });
    }
  }
  return { findings, unresolved, compared };
}

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!isExcludedScanDir(entry.name, full)) walk(full, out);
      continue;
    }
    if (EXTENSIONS.has(extname(entry.name))) out.push(full);
  }
  return out;
}

// A scan that reports zero because its regex matches nothing reads exactly like a clean repository.
function selfTest() {
  const document = {
    paths: {
      "/things": { get: { parameters: [{ in: "query", name: "cursor" }, { in: "query", name: "pageSize" }] } },
      "/things/{thingId}/runs": { get: { parameters: [] } },
    },
  };
  const byRoute = declaredQueryParams(document);
  const cases = [
    {
      name: "undeclared key against a declared route is reported",
      src: 'apiClient.get<Page>("/things", { page: 1, cursor: c }, signal, contract)',
      expect: ["page"],
    },
    {
      name: "every declared key is accepted",
      src: 'apiClient.get("/things", { cursor: c, pageSize: 50 }, signal)',
      expect: [],
    },
    {
      name: "a route declaring no query params rejects everything sent to it",
      src: 'apiClient.get(`/things/${id}/runs`, { page: 1 }, signal)',
      expect: ["page"],
    },
    {
      name: "commas inside a string value are not read as keys",
      src: 'apiClient.get("/things", { cursor: "a,b,c" }, signal)',
      expect: [],
    },
    {
      name: "a params variable is counted unresolved, never reported as clean",
      src: 'apiClient.get("/things", filters, signal)',
      expect: [],
      unresolved: 1,
    },
    {
      name: "an undocumented route is skipped rather than reported",
      src: 'apiClient.get("/not-in-document", { page: 1 }, signal)',
      expect: [],
    },
  ];

  let failed = 0;
  for (const testCase of cases) {
    const { findings, unresolved } = scanSource(testCase.src, "fixture.ts", byRoute);
    const got = findings.map((f) => f.key).sort();
    const want = [...testCase.expect].sort();
    const keysOk = JSON.stringify(got) === JSON.stringify(want);
    const unresolvedOk = testCase.unresolved === undefined || unresolved === testCase.unresolved;
    if (keysOk && unresolvedOk) {
      console.log(`  ok   ${testCase.name}`);
      continue;
    }
    failed++;
    console.log(`  FAIL ${testCase.name}`);
    console.log(`       keys expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    if (!unresolvedOk) console.log(`       unresolved expected ${testCase.unresolved}, got ${unresolved}`);
  }

  console.log(failed === 0 ? "\ncheck-request-params self-test: PASS" : `\ncheck-request-params self-test: FAIL (${failed})`);
  process.exit(failed === 0 ? 0 : 1);
}

function main() {
  if (process.argv.includes("--self-test")) return selfTest();

  const document = JSON.parse(readFileSync(join(ROOT, "contracts/openapi.json"), "utf8"));
  const byRoute = declaredQueryParams(document);

  const files = walk(ROOT, []).filter((f) => !isTestFile(relative(ROOT, f)));
  const findings = [];
  let unresolved = 0;
  let compared = 0;

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (!source.includes("apiClient.")) continue;
    const result = scanSource(source, relative(ROOT, file), byRoute);
    findings.push(...result.findings);
    unresolved += result.unresolved;
    compared += result.compared;
  }

  console.log("\nRequest query parameters against the generated document\n");
  console.log(`  Documented routes:            ${byRoute.size}`);
  console.log(`  Literal param sites read:     ${compared}`);
  console.log(`  Unresolved (variable/spread): ${unresolved}   <- covered by nothing here`);
  console.log(`  Undeclared keys sent:         ${findings.length}   [ceiling ${UNKNOWN_PARAM_CEILING}, ratchet]\n`);

  for (const f of findings)
    console.log(`  ${f.file}:${f.line}  ${f.route}  sends "${f.key}"  (declared: ${f.allowed.join(",") || "none"})`);

  const totalCallSites = compared + unresolved;
  if (totalCallSites < MIN_CALL_SITES) {
    console.log(
      `\nINCONCLUSIVE: only ${totalCallSites} total call sites found (floor ${MIN_CALL_SITES}). ` +
        `The regex is broken or the openapi document is missing; a broken scan reports zero violations on any tree.`,
    );
    process.exit(1);
  }

  if (findings.length > UNKNOWN_PARAM_CEILING) {
    console.log(
      `\nFAIL: ${findings.length} undeclared query key(s), ceiling ${UNKNOWN_PARAM_CEILING}.` +
        `\nFix the caller, or declare the parameter in the backend schema and regenerate the document.`,
    );
    process.exit(1);
  }

  console.log(`PASS: no undeclared query keys at ${compared} literal call site(s).`);
  console.log(`NOTE: ${unresolved} site(s) forward a variable or spread and are NOT covered by this gate.`);
}

main();
