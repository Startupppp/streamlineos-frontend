import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), "..");
const CONTRACT_PATH = join(ROOT, "contracts", "openapi.json");

const HOOK_DIRS = [
  join(ROOT, "hooks", "api", "timesheets"),
  join(ROOT, "hooks", "api", "timesheets-core"),
];

const TYPES_PATH = join(ROOT, "features", "timesheets", "types.ts");

function normalizePath(raw) {
  return raw
    .replace(/^[`'"]/u, "")
    .replace(/[`'"]$/u, "")
    .replace(/\$\{(\w+)\}/gu, "{$1}");
}

function* walkTs(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walkTs(full);
    else if (extname(e.name) === ".ts" && !e.name.endsWith(".test.ts")) yield full;
  }
}

function buildInterfaceMap(content) {
  const map = new Map();
  const headerRe = /(?:export\s+)?interface\s+(\w+)\s*(?:\{|extends)/gu;
  let m;
  while ((m = headerRe.exec(content)) !== null) {
    const name = m[1];
    const openBrace = content.indexOf("{", m.index + m[0].length - 1);
    if (openBrace < 0 || openBrace > m.index + m[0].length + 10) continue;
    let depth = 0;
    let closeBrace = -1;
    for (let i = openBrace; i < content.length; i++) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") {
        depth--;
        if (depth === 0) { closeBrace = i; break; }
      }
    }
    if (closeBrace < 0) continue;
    const body = content.slice(openBrace + 1, closeBrace);
    const fields = new Set();
    const fieldRe = /^\s{2,6}(\w+)\??:/gmu;
    let fm;
    while ((fm = fieldRe.exec(body)) !== null) {
      fields.add(fm[1]);
    }
    if (fields.size > 0) map.set(name, fields);
  }
  return map;
}

function findMatchingClose(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

const API_RE = /apiClient\.(get|post|put|patch|delete)<[^>]*?>\s*\(\s*(`[^`]*`|'[^']*'|"[^"]*")/gu;
const INLINE_OBJ_RE = /^,\s*\{\s*((?:\w+\s*,\s*)*\w+)\s*\}\s*\)/u;
const DATA_TYPE_RE_G = /\bdata\s*:\s*(?:Partial<)?(\w+)(?:>)?\b/gu;

function isComputedSegment(segment) {
  if (!segment.startsWith("{") || !segment.endsWith("}")) return false;
  const inner = segment.slice(1, -1);
  return !inner.endsWith("Id") && !inner.endsWith("id") && !inner.endsWith("Num");
}

function pathToTemplate(p) {
  return p.replace(/\{[^}]+\}/gu, "{X}");
}

function extractFrontendCalls(interfaceMap) {
  const calls = [];
  let skipped = 0;

  for (const dir of HOOK_DIRS) {
    for (const file of walkTs(dir)) {
      const content = readFileSync(file, "utf8");
      API_RE.lastIndex = 0;
      let m;
      while ((m = API_RE.exec(content)) !== null) {
        const method = m[1].toUpperCase();
        const path = normalizePath(m[2]);

        const segments = path.split("/").filter(Boolean);
        if (segments.some(isComputedSegment)) {
          skipped++;
          continue;
        }

        const afterUrl = content.slice(m.index + m[0].length);
        const closeIdx = findMatchingClose(afterUrl);
        const bodyStr = afterUrl.slice(0, closeIdx > 0 ? closeIdx : 150);

        let bodyFields = null;

        const inlineMatch = INLINE_OBJ_RE.exec(bodyStr + ")");
        if (inlineMatch) {
          bodyFields = new Set(
            inlineMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
          );
        } else if (/,\s*\w+\s*$/.test(bodyStr)) {
          const contextBefore = content.slice(Math.max(0, m.index - 800), m.index);
          DATA_TYPE_RE_G.lastIndex = 0;
          let typeMatch = null;
          let tempM;
          while ((tempM = DATA_TYPE_RE_G.exec(contextBefore)) !== null) {
            typeMatch = tempM;
          }
          if (typeMatch) {
            const typeName = typeMatch[1];
            const fields = interfaceMap.get(typeName);
            if (fields) bodyFields = fields;
          }
        }

        calls.push({ method, path, bodyFields, file });
      }
    }
  }

  return { calls, skipped };
}

function getContractSchema(contract, path, method) {
  const pathItem = contract.paths?.[path];
  if (!pathItem) return null;
  const op = pathItem[method.toLowerCase()];
  if (!op) return null;
  return op.requestBody?.content?.["application/json"]?.schema ?? null;
}

function getContractPaths(contract) {
  return new Set(Object.keys(contract.paths ?? {}));
}

function findContractPath(contract, frontendPath) {
  const contractPaths = getContractPaths(contract);
  if (contractPaths.has(frontendPath)) return frontendPath;
  const frontendTemplate = pathToTemplate(frontendPath);
  for (const cp of contractPaths) {
    if (pathToTemplate(cp) === frontendTemplate) return cp;
  }
  return null;
}

function checkMissingPath(call, contract) {
  const match = findContractPath(contract, call.path);
  if (!match) return `path not in contract: ${call.method} ${call.path}`;
  return null;
}

function checkMethodMismatch(call, contract) {
  const contractPath = findContractPath(contract, call.path);
  if (!contractPath) return null;
  const pathItem = contract.paths[contractPath];
  if (!pathItem[call.method.toLowerCase()]) {
    const available = Object.keys(pathItem)
      .filter((k) => k !== "parameters")
      .map((k) => k.toUpperCase())
      .join(", ");
    return `method mismatch: frontend uses ${call.method} ${call.path}, contract has [${available}]`;
  }
  return null;
}

function checkExtraBodyFields(call, contract) {
  if (!call.bodyFields) return null;
  const contractPath = findContractPath(contract, call.path);
  if (!contractPath) return null;
  const schema = getContractSchema(contract, contractPath, call.method);
  if (!schema?.properties) return null;
  const allowed = new Set(Object.keys(schema.properties));
  const extra = [...call.bodyFields].filter((f) => !allowed.has(f));
  if (extra.length === 0) return null;
  return `extra body fields on ${call.method} ${call.path} not in contract schema: ${extra.join(", ")}`;
}

function checkMissingRequiredFields(call, contract) {
  if (!call.bodyFields) return null;
  const contractPath = findContractPath(contract, call.path);
  if (!contractPath) return null;
  const schema = getContractSchema(contract, contractPath, call.method);
  if (!schema?.required) return null;
  const required = schema.required;
  const missing = required.filter((f) => !call.bodyFields.has(f));
  if (missing.length === 0) return null;
  return `missing required fields on ${call.method} ${call.path}: ${missing.join(", ")} (contract marks them required)`;
}

function runChecks(calls, contract) {
  const violations = [];
  for (const call of calls) {
    const v1 = checkMissingPath(call, contract);
    if (v1) { violations.push(v1); continue; }
    const v2 = checkMethodMismatch(call, contract);
    if (v2) violations.push(v2);
    const v3 = checkExtraBodyFields(call, contract);
    if (v3) violations.push(v3);
    const v4 = checkMissingRequiredFields(call, contract);
    if (v4) violations.push(v4);
  }
  return violations;
}

function runSelfTest() {
  const contract = {
    paths: {
      "/timesheets/entries": {
        get: {},
        post: {
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["date", "hours"],
                  properties: {
                    date: { type: "string" },
                    hours: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const matchingCall = {
    method: "POST",
    path: "/timesheets/entries",
    bodyFields: new Set(["date", "hours"]),
    file: "<self-test>",
  };

  const rule1Call = {
    method: "POST",
    path: "/timesheets/nonexistent-endpoint",
    bodyFields: new Set(["date"]),
    file: "<self-test>",
  };

  const rule2Call = {
    method: "PUT",
    path: "/timesheets/entries",
    bodyFields: new Set(["date", "hours"]),
    file: "<self-test>",
  };

  const rule3Call = {
    method: "POST",
    path: "/timesheets/entries",
    bodyFields: new Set(["date", "hours", "unknownField"]),
    file: "<self-test>",
  };

  const rule4Call = {
    method: "POST",
    path: "/timesheets/entries",
    bodyFields: new Set(["date"]),
    file: "<self-test>",
  };

  let passed = 0;
  let failed = 0;

  function assert(label, condition) {
    if (condition) {
      console.log(`  pass  ${label}`);
      passed++;
    } else {
      console.error(`  FAIL  ${label}`);
      failed++;
    }
  }

  const matchingViolations = runChecks([matchingCall], contract);
  assert("matching pair produces no violations", matchingViolations.length === 0);

  const r1 = checkMissingPath(rule1Call, contract);
  assert("rule 1 fires: path absent from contract", r1 !== null);

  const r2 = checkMethodMismatch(rule2Call, contract);
  assert("rule 2 fires: method mismatch on known path", r2 !== null);

  const r3 = checkExtraBodyFields(rule3Call, contract);
  assert("rule 3 fires: body field not in contract schema properties", r3 !== null && r3.includes("unknownField"));

  const r4 = checkMissingRequiredFields(rule4Call, contract);
  assert("rule 4 fires: required field absent from frontend body", r4 !== null && r4.includes("hours"));

  console.log(`\n  ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error("\n✖  self-test failed");
    process.exit(1);
  }

  console.log("\n✔  self-test passed — all four drift rules are wired and fire");
  process.exit(0);
}

const SELF_TEST = process.argv.includes("--self-test");

if (SELF_TEST) {
  console.log("Running self-test...\n");
  runSelfTest();
}

if (!existsSync(CONTRACT_PATH)) {
  console.error("✖  Contract artifact not yet vendored.");
  console.error(`   Expected: ${CONTRACT_PATH}`);
  console.error("");
  console.error("   To generate and vendor:");
  console.error("     pnpm --filter streamlineos-api openapi:generate");
  console.error("     cp backend/openapi.json frontend/contracts/openapi.json");
  console.error("");
  console.error("   Until the artifact exists, this check cannot run and is a CI blocker.");
  process.exit(1);
}

const contract = JSON.parse(readFileSync(CONTRACT_PATH, "utf8"));

let interfaceMap = new Map();
if (existsSync(TYPES_PATH)) {
  interfaceMap = buildInterfaceMap(readFileSync(TYPES_PATH, "utf8"));
}

const { calls, skipped } = extractFrontendCalls(interfaceMap);
const bodyResolved = calls.filter((c) => c.bodyFields !== null).length;

console.log(`Timesheets calls extracted: ${calls.length} (body resolved: ${bodyResolved}, skipped computed paths: ${skipped})`);

const violations = runChecks(calls, contract);

if (violations.length === 0) {
  console.log("✔  No timesheets contract drift detected.");
  process.exit(0);
} else {
  console.error(`\n✖  ${violations.length} contract drift violation(s):\n`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
