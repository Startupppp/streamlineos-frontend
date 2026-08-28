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

const FEATURES_ROOT = join(ROOT, "features");

const MIN_RESOLVED_FRACTION = 0.40;

const KNOWN_DRIFT = [
  {
    type: "enum",
    method: "POST",
    path: "/timesheets/entries",
    field: "billingType",
    offendingMembers: ["INTERNAL"],
    contractEnum: ["BILLABLE", "NON_BILLABLE", "FIXED"],
    since: "2026-08-28",
    reason: "Frontend type includes INTERNAL but backend Zod schema accepts only BILLABLE, NON_BILLABLE, FIXED; unresolved product decision on which billing-type enum is canonical",
  },
  {
    type: "enum",
    method: "POST",
    path: "/timesheets/entries",
    field: "source",
    offendingMembers: ["GRID"],
    contractEnum: ["MANUAL", "TIMER", "API", "IMPORT"],
    since: "2026-08-28",
    reason: "Frontend type includes GRID but backend Zod schema accepts only MANUAL, TIMER, API, IMPORT; unresolved product decision on which source enum is canonical",
  },
  {
    type: "enum",
    method: "PATCH",
    path: "/timesheets/entries/{entryId}",
    field: "billingType",
    offendingMembers: ["INTERNAL"],
    contractEnum: ["BILLABLE", "NON_BILLABLE", "FIXED"],
    since: "2026-08-28",
    reason: "Frontend type includes INTERNAL but backend Zod schema accepts only BILLABLE, NON_BILLABLE, FIXED; unresolved product decision on which billing-type enum is canonical",
  },
  {
    type: "extra-field",
    method: "POST",
    path: "/timesheets/exceptions/{exceptionId}/resolve",
    field: "reason",
    since: "2026-08-28",
    reason: "Frontend sends a reason field that the backend contract schema does not list in properties; unresolved frontend/backend schema disagreement awaiting a product decision",
  },
  {
    type: "enum",
    method: "POST",
    path: "/timesheets/rates",
    field: "billingType",
    offendingMembers: ["INTERNAL"],
    contractEnum: ["BILLABLE", "NON_BILLABLE", "FIXED"],
    since: "2026-08-28",
    reason: "Frontend type includes INTERNAL but backend Zod schema accepts only BILLABLE, NON_BILLABLE, FIXED; unresolved product decision on which billing-type enum is canonical",
  },
  {
    type: "enum",
    method: "PATCH",
    path: "/timesheets/rates/{rateId}",
    field: "billingType",
    offendingMembers: ["INTERNAL"],
    contractEnum: ["BILLABLE", "NON_BILLABLE", "FIXED"],
    since: "2026-08-28",
    reason: "Frontend type includes INTERNAL but backend Zod schema accepts only BILLABLE, NON_BILLABLE, FIXED; unresolved product decision on which billing-type enum is canonical",
  },
  {
    type: "enum",
    method: "PATCH",
    path: "/timesheets/settings",
    field: "approvalMode",
    offendingMembers: ["NONE", "PROJECT", "CLIENT"],
    contractEnum: ["MANAGER", "AUTO", "MULTI_LEVEL"],
    since: "2026-08-28",
    reason: "Frontend type includes NONE, PROJECT, CLIENT but backend Zod schema accepts only MANAGER, AUTO, MULTI_LEVEL; unresolved product decision on which approval-mode enum is canonical",
  },
];

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

function buildTypeAliasEnumMap(content) {
  const map = new Map();
  const typeRe = /export\s+type\s+(\w+)\s*=([^;]+);/gu;
  let m;
  while ((m = typeRe.exec(content)) !== null) {
    const name = m[1];
    const body = m[2];
    const literals = [];
    const litRe = /"([^"]+)"/gu;
    let lit;
    while ((lit = litRe.exec(body)) !== null) {
      literals.push(lit[1]);
    }
    if (literals.length >= 2) map.set(name, literals);
  }
  return map;
}

function buildInterfaceFieldTypeMap(content) {
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
    const fieldTypeMap = new Map();
    const fieldRe = /^\s{2,6}(\w+)\??:\s*(?:Partial<)?([A-Z]\w*)(?:<[^>]*>)?(?:\[\])?/gmu;
    let fm;
    while ((fm = fieldRe.exec(body)) !== null) {
      fieldTypeMap.set(fm[1], fm[2]);
    }
    if (fieldTypeMap.size > 0) map.set(name, fieldTypeMap);
  }
  return map;
}

function buildZodObjectFieldMap(content) {
  const map = new Map();
  const zodRe = /\bconst\s+(\w+)\s*=\s*(?:\w+\.)*z\.object\s*\(\s*\{/gu;
  let m;
  while ((m = zodRe.exec(content)) !== null) {
    const varName = m[1];
    const startIdx = m.index + m[0].length;
    let depth = 1;
    let i = startIdx;
    while (i < content.length && depth > 0) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") depth--;
      i++;
    }
    const body = content.slice(startIdx, i - 1);
    const fields = new Set();
    const fieldRe = /^\s{2,4}(\w+):/gmu;
    let fm;
    while ((fm = fieldRe.exec(body)) !== null) {
      fields.add(fm[1]);
    }
    if (fields.size > 0) map.set(varName, fields);
  }
  return map;
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

  const zodObjMap = buildZodObjectFieldMap(content);
  const inferRe = /\btype\s+(\w+)\s*=\s*z\.infer\s*<\s*typeof\s+(\w+)\s*>/gu;
  let im;
  while ((im = inferRe.exec(content)) !== null) {
    const typeName = im[1];
    const schemaVar = im[2];
    const fields = zodObjMap.get(schemaVar);
    if (fields) map.set(typeName, new Set(fields));
  }

  return map;
}

function collectTypeContent(hookDirs, featuresRoot) {
  const seenPaths = new Set();
  const parts = [];

  const readAndTrack = (p) => {
    if (seenPaths.has(p) || !existsSync(p)) return null;
    seenPaths.add(p);
    const content = readFileSync(p, "utf8");
    parts.push(content);
    return content;
  };

  readAndTrack(join(featuresRoot, "timesheets", "types.ts"));

  const importRe = /from\s+["']@\/features\/timesheets\/([^"']+)["']/gu;

  for (const dir of hookDirs) {
    for (const hookFile of walkTs(dir)) {
      const hookContent = readAndTrack(hookFile);
      if (!hookContent) continue;
      importRe.lastIndex = 0;
      let im;
      while ((im = importRe.exec(hookContent)) !== null) {
        const rel = im[1].replace(/\.js$/, "");
        readAndTrack(join(featuresRoot, "timesheets", `${rel}.ts`));
      }
    }
  }

  return parts.join("\n\n");
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
const INLINE_OBJ_RE = /^,\s*\{\s*((?:\w+\s*,\s*)*\w+)\s*\},?\s*\)/u;
const BODY_PARAM_RE_G = /\b(?:data|input|body|payload)\s*:\s*(Partial<)?([A-Z]\w+)(?:>)?\b/gu;

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
        let bodyTypeName = null;
        let isPartial = false;

        const inlineMatch = INLINE_OBJ_RE.exec(bodyStr + ")");
        if (inlineMatch) {
          bodyFields = new Set(
            inlineMatch[1].split(",").map((s) => s.trim()).filter(Boolean),
          );
        } else if (/,\s*\w+\s*$/.test(bodyStr)) {
          const contextBefore = content.slice(Math.max(0, m.index - 800), m.index);
          BODY_PARAM_RE_G.lastIndex = 0;
          let typeMatch = null;
          let tempM;
          while ((tempM = BODY_PARAM_RE_G.exec(contextBefore)) !== null) {
            typeMatch = tempM;
          }
          if (typeMatch) {
            isPartial = typeMatch[1] !== undefined;
            bodyTypeName = typeMatch[2];
            const fields = interfaceMap.get(bodyTypeName);
            if (fields) bodyFields = new Set(fields);
          }
        }

        calls.push({ method, path, bodyFields, bodyTypeName, isPartial, file });
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
  if (call.isPartial || !call.bodyFields) return null;
  const contractPath = findContractPath(contract, call.path);
  if (!contractPath) return null;
  const schema = getContractSchema(contract, contractPath, call.method);
  if (!schema?.required) return null;
  const required = schema.required;
  const missing = required.filter((f) => !call.bodyFields.has(f));
  if (missing.length === 0) return null;
  return `missing required fields on ${call.method} ${call.path}: ${missing.join(", ")} (contract marks them required)`;
}

function checkEnumDrift(call, contract, interfaceFieldTypeMap, typeAliasEnumMap) {
  if (!call.bodyFields || !call.bodyTypeName) return { violation: null, narrowing: null };
  const contractPath = findContractPath(contract, call.path);
  if (!contractPath) return { violation: null, narrowing: null };
  const schema = getContractSchema(contract, contractPath, call.method);
  if (!schema?.properties) return { violation: null, narrowing: null };

  const fieldTypeMap = interfaceFieldTypeMap.get(call.bodyTypeName);
  if (!fieldTypeMap) return { violation: null, narrowing: null };

  const extraEntries = [];
  const narrowingEntries = [];

  for (const fieldName of call.bodyFields) {
    const contractProp = schema.properties[fieldName];
    if (!Array.isArray(contractProp?.enum)) continue;
    const contractSet = new Set(contractProp.enum);

    const typeName = fieldTypeMap.get(fieldName);
    if (!typeName) continue;

    const frontendMembers = typeAliasEnumMap.get(typeName);
    if (!frontendMembers) continue;

    const extra = frontendMembers.filter((v) => !contractSet.has(v));
    if (extra.length > 0) {
      extraEntries.push(
        `${fieldName}: frontend can send [${extra.join(", ")}] but contract enum is [${contractProp.enum.join(", ")}]`,
      );
    }

    const missing = [...contractSet].filter((v) => !frontendMembers.includes(v));
    if (missing.length > 0) {
      narrowingEntries.push(
        `${fieldName}: contract allows [${missing.join(", ")}] but frontend type omits them`,
      );
    }
  }

  const violation =
    extraEntries.length > 0
      ? `enum member drift on ${call.method} ${call.path} — ${extraEntries.join("; ")}`
      : null;
  const narrowing =
    narrowingEntries.length > 0
      ? `narrowing on ${call.method} ${call.path} — ${narrowingEntries.join("; ")}`
      : null;

  return { violation, narrowing };
}

function checkResolutionFloor(calls, minFraction) {
  if (calls.length === 0) return null;
  const resolved = calls.filter((c) => c.bodyFields !== null).length;
  const fraction = resolved / calls.length;
  if (fraction < minFraction) {
    return `body-resolution floor violated: ${resolved}/${calls.length} resolved (${Math.round(fraction * 100)}%) is below the minimum ${Math.round(minFraction * 100)}% — a refactor may have broken the body-type extractor`;
  }
  return null;
}

function runChecks(calls, contract, interfaceFieldTypeMap, typeAliasEnumMap) {
  const violations = [];
  const narrowings = [];
  for (const call of calls) {
    const v1 = checkMissingPath(call, contract);
    if (v1) { violations.push(v1); continue; }
    const v2 = checkMethodMismatch(call, contract);
    if (v2) violations.push(v2);
    const v3 = checkExtraBodyFields(call, contract);
    if (v3) violations.push(v3);
    const v4 = checkMissingRequiredFields(call, contract);
    if (v4) violations.push(v4);
    const { violation: v5, narrowing: n5 } = checkEnumDrift(
      call,
      contract,
      interfaceFieldTypeMap,
      typeAliasEnumMap,
    );
    if (v5) violations.push(v5);
    if (n5) narrowings.push(n5);
  }
  return { violations, narrowings };
}

function driftKeyForEntry(entry) {
  if (entry.type === "enum") {
    const sorted = [...entry.offendingMembers].sort();
    return `ENUM:${entry.method} ${entry.path}:${entry.field}:[${sorted.join(",")}]`;
  }
  return `EXTRA:${entry.method} ${entry.path}:${entry.field}`;
}

function extractDriftKeysFromViolation(violation) {
  const keys = new Set();
  const enumPrefix = "enum member drift on ";
  if (violation.startsWith(enumPrefix)) {
    const rest = violation.slice(enumPrefix.length);
    const dashIdx = rest.indexOf(" — ");
    if (dashIdx < 0) return keys;
    const endpointStr = rest.slice(0, dashIdx);
    const entriesPart = rest.slice(dashIdx + 3);
    const spaceIdx = endpointStr.indexOf(" ");
    if (spaceIdx < 0) return keys;
    const method = endpointStr.slice(0, spaceIdx);
    const path = endpointStr.slice(spaceIdx + 1);
    for (const fieldEntry of entriesPart.split("; ")) {
      const colonIdx = fieldEntry.indexOf(":");
      if (colonIdx < 0) continue;
      const fieldName = fieldEntry.slice(0, colonIdx).trim();
      const sendMatch = /frontend can send \[([^\]]*)\]/.exec(fieldEntry);
      if (!sendMatch) continue;
      const members = sendMatch[1].split(", ").map((s) => s.trim()).filter(Boolean).sort();
      keys.add(`ENUM:${method} ${path}:${fieldName}:[${members.join(",")}]`);
    }
    return keys;
  }
  const extraPrefix = "extra body fields on ";
  if (violation.startsWith(extraPrefix)) {
    const rest = violation.slice(extraPrefix.length);
    const suffix = " not in contract schema: ";
    const suffixIdx = rest.indexOf(suffix);
    if (suffixIdx < 0) return keys;
    const endpointStr = rest.slice(0, suffixIdx);
    const fieldsPart = rest.slice(suffixIdx + suffix.length);
    const spaceIdx = endpointStr.indexOf(" ");
    if (spaceIdx < 0) return keys;
    const method = endpointStr.slice(0, spaceIdx);
    const path = endpointStr.slice(spaceIdx + 1);
    for (const field of fieldsPart.split(", ").map((s) => s.trim()).filter(Boolean)) {
      keys.add(`EXTRA:${method} ${path}:${field}`);
    }
    return keys;
  }
  return keys;
}

function applyBaseline(violations, baseline = KNOWN_DRIFT) {
  const baselineKeyMap = new Map(baseline.map((e) => [driftKeyForEntry(e), e]));
  const seenBaselineKeys = new Set();
  const newViolations = [];
  const baselinedViolations = [];
  for (const violation of violations) {
    const vKeys = extractDriftKeysFromViolation(violation);
    const unbaselined = [];
    for (const k of vKeys) {
      if (baselineKeyMap.has(k)) seenBaselineKeys.add(k);
      else unbaselined.push(k);
    }
    if (vKeys.size === 0 || unbaselined.length > 0) newViolations.push(violation);
    else baselinedViolations.push(violation);
  }
  const staleEntries = baseline.filter((e) => !seenBaselineKeys.has(driftKeyForEntry(e)));
  return { newViolations, baselinedViolations, staleEntries };
}

function printBaseline(baseline = KNOWN_DRIFT) {
  console.log(`\n=== KNOWN UNFIXED DEFECTS — ${baseline.length} baselined drift(s) tracked; not accepted behaviour; awaiting resolution ===`);
  for (const entry of baseline) {
    const endpoint = `${entry.method} ${entry.path}`;
    if (entry.type === "enum") {
      console.log(`  [since ${entry.since}] ${endpoint} / ${entry.field}`);
      console.log(`    frontend sends: [${entry.offendingMembers.join(", ")}]   contract accepts: [${entry.contractEnum.join(", ")}]`);
    } else {
      console.log(`  [since ${entry.since}] ${endpoint} / ${entry.field} (extra field absent from contract schema)`);
    }
    console.log(`    reason: ${entry.reason}`);
  }
  console.log("===");
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
                    billingType: { type: "string", enum: ["BILLABLE", "NON_BILLABLE", "FIXED"] },
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
    bodyTypeName: null,
    isPartial: false,
    file: "<self-test>",
  };

  const rule1Call = {
    method: "POST",
    path: "/timesheets/nonexistent-endpoint",
    bodyFields: new Set(["date"]),
    bodyTypeName: null,
    isPartial: false,
    file: "<self-test>",
  };

  const rule2Call = {
    method: "PUT",
    path: "/timesheets/entries",
    bodyFields: new Set(["date", "hours"]),
    bodyTypeName: null,
    isPartial: false,
    file: "<self-test>",
  };

  const rule3Call = {
    method: "POST",
    path: "/timesheets/entries",
    bodyFields: new Set(["date", "hours", "unknownField"]),
    bodyTypeName: null,
    isPartial: false,
    file: "<self-test>",
  };

  const rule4Call = {
    method: "POST",
    path: "/timesheets/entries",
    bodyFields: new Set(["date"]),
    bodyTypeName: null,
    isPartial: false,
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

  const emptyMaps = [new Map(), new Map()];

  const { violations: matchingViolations } = runChecks([matchingCall], contract, ...emptyMaps);
  assert("matching pair produces no violations", matchingViolations.length === 0);

  const r1 = checkMissingPath(rule1Call, contract);
  assert("rule 1 fires: path absent from contract", r1 !== null);

  const r2 = checkMethodMismatch(rule2Call, contract);
  assert("rule 2 fires: method mismatch on known path", r2 !== null);

  const r3 = checkExtraBodyFields(rule3Call, contract);
  assert("rule 3 fires: body field not in contract schema properties", r3 !== null && r3.includes("unknownField"));

  const r4 = checkMissingRequiredFields(rule4Call, contract);
  assert("rule 4 fires: required field absent from frontend body", r4 !== null && r4.includes("hours"));

  const feTypeAliasMap = new Map([["BillingType", ["BILLABLE", "NON_BILLABLE", "INTERNAL"]]]);
  const feFieldTypeMap = new Map([["CreateEntryInput", new Map([["billingType", "BillingType"]])]]);

  const enumDriftCall = {
    method: "POST",
    path: "/timesheets/entries",
    bodyFields: new Set(["date", "hours", "billingType"]),
    bodyTypeName: "CreateEntryInput",
    isPartial: false,
    file: "<self-test>",
  };

  const { violation: r5 } = checkEnumDrift(enumDriftCall, contract, feFieldTypeMap, feTypeAliasMap);
  assert(
    "rule 5 fires: enum member INTERNAL sent by frontend not in contract enum",
    r5 !== null && r5.includes("INTERNAL"),
  );

  const feNarrowAliasMap = new Map([["BillingType", ["BILLABLE"]]]);
  const { violation: r5b, narrowing: r5n } = checkEnumDrift(
    enumDriftCall,
    contract,
    feFieldTypeMap,
    feNarrowAliasMap,
  );
  assert("narrowing: frontend sending a subset of contract does not fire a violation", r5b === null);
  assert("narrowing: frontend sending a subset of contract reports a narrowing", r5n !== null);

  const partialCall = {
    method: "POST",
    path: "/timesheets/entries",
    bodyFields: new Set(["billingType"]),
    bodyTypeName: "CreateEntryInput",
    isPartial: true,
    file: "<self-test>",
  };
  const r6 = checkMissingRequiredFields(partialCall, contract);
  assert("Partial<T> body: missing required fields are not flagged when isPartial is true", r6 === null);

  const allNullCalls = Array.from({ length: 10 }, () => ({
    method: "POST",
    path: "/timesheets/entries",
    bodyFields: null,
    bodyTypeName: null,
    isPartial: false,
    file: "<self-test>",
  }));
  const r7 = checkResolutionFloor(allNullCalls, 0.3);
  assert("resolution floor fires when all bodies are unresolved", r7 !== null);

  const halfResolvedCalls = allNullCalls.map((c, i) =>
    i < 4 ? { ...c, bodyFields: new Set(["date"]) } : c,
  );
  const r7b = checkResolutionFloor(halfResolvedCalls, 0.3);
  assert("resolution floor does not fire when resolved fraction meets the minimum", r7b === null);

  const testBaseline = [
    {
      type: "enum",
      method: "POST",
      path: "/timesheets/entries",
      field: "billingType",
      offendingMembers: ["INTERNAL"],
      contractEnum: ["BILLABLE", "NON_BILLABLE", "FIXED"],
      since: "2026-08-28",
      reason: "test baseline entry",
    },
  ];

  const baselinedViol = "enum member drift on POST /timesheets/entries — billingType: frontend can send [INTERNAL] but contract enum is [BILLABLE, NON_BILLABLE, FIXED]";
  const { newViolations: r8new, baselinedViolations: r8base } = applyBaseline([baselinedViol], testBaseline);
  assert("baselined violation is not in newViolations", r8new.length === 0);
  assert("baselined violation is captured in baselinedViolations", r8base.length === 1);

  const combinedViol = "enum member drift on POST /timesheets/entries — billingType: frontend can send [INTERNAL] but contract enum is [BILLABLE, NON_BILLABLE, FIXED]; extraField: frontend can send [SOMETHING] but contract enum is [OTHER]";
  const { newViolations: r9new } = applyBaseline([combinedViol], testBaseline);
  assert("non-baselined field on same endpoint still produces a new violation", r9new.length === 1);

  const { staleEntries: r10stale } = applyBaseline([], testBaseline);
  assert("stale baseline entry detected when no matching violation exists", r10stale.length === 1);

  let r11threw = false;
  try { printBaseline([]); } catch { r11threw = true; }
  assert("printBaseline runs without throwing even with an empty baseline", !r11threw);

  console.log(`\n  ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error("\n✖  self-test failed");
    process.exit(1);
  }

  console.log("\n✔  self-test passed — all sixteen cases wired and fire");
  process.exit(0);
}

const SELF_TEST = process.argv.includes("--self-test");
const USE_FIXTURE = process.argv.includes("--use-fixture");

const FIXTURE_PATH = join(ROOT, "contracts", "__fixtures__", "timesheets-fixture.json");

if (SELF_TEST) {
  console.log("Running self-test...\n");
  runSelfTest();
}

if (!USE_FIXTURE && !existsSync(CONTRACT_PATH)) {
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

const contractFile = USE_FIXTURE ? FIXTURE_PATH : CONTRACT_PATH;
const contract = JSON.parse(readFileSync(contractFile, "utf8"));

const allContent = collectTypeContent(HOOK_DIRS, FEATURES_ROOT);
const interfaceMap = buildInterfaceMap(allContent);
const typeAliasEnumMap = buildTypeAliasEnumMap(allContent);
const interfaceFieldTypeMap = buildInterfaceFieldTypeMap(allContent);

const { calls, skipped } = extractFrontendCalls(interfaceMap);
const bodyResolved = calls.filter((c) => c.bodyFields !== null).length;
const bodyUnresolved = calls.length - bodyResolved;

console.log(
  `Timesheets calls extracted: ${calls.length} (body resolved: ${bodyResolved}, body unresolved: ${bodyUnresolved}, skipped computed paths: ${skipped})`,
);

const { violations, narrowings } = runChecks(calls, contract, interfaceFieldTypeMap, typeAliasEnumMap);

printBaseline();

if (narrowings.length > 0) {
  console.log(
    `\n  ${narrowings.length} narrowing(s) — contract allows values the frontend type does not include (not a failure):`,
  );
  for (const n of narrowings) console.log(`    ${n}`);
}

const floorViolation = checkResolutionFloor(calls, MIN_RESOLVED_FRACTION);
const { newViolations, baselinedViolations, staleEntries } = applyBaseline(violations);
const allNewViolations = floorViolation ? [...newViolations, floorViolation] : newViolations;

if (baselinedViolations.length > 0) {
  console.log(`\n  ${baselinedViolations.length} known drift(s) tracked in KNOWN_DRIFT baseline — not yet fixed, not failing CI:`);
  for (const v of baselinedViolations) console.log(`    ${v}`);
}

if (staleEntries.length > 0) {
  console.error(`\n✖  ${staleEntries.length} stale KNOWN_DRIFT entry(entries) — these no longer match any actual violation; delete them from KNOWN_DRIFT:`);
  for (const e of staleEntries) console.error(`    ${driftKeyForEntry(e)}`);
}

if (allNewViolations.length > 0) {
  console.error(`\n✖  ${allNewViolations.length} contract drift violation(s) not covered by KNOWN_DRIFT baseline:\n`);
  for (const v of allNewViolations) console.error(`  ${v}`);
}

if (allNewViolations.length === 0 && staleEntries.length === 0) {
  if (baselinedViolations.length > 0) {
    console.log(`\n⚠  ${baselinedViolations.length} known baselined drift(s) are tracked but not failing CI. Fix them when the product decision lands.`);
  }
  console.log("\n✔  No new timesheets contract drift detected.");
  process.exit(0);
} else {
  process.exit(1);
}
