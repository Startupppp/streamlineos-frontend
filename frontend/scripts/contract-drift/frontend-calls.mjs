import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const CALL_HEAD_RE = /\bapiClient\.(get|post|put|patch|delete)\s*[<(]/gu;
const IDENT_RE = /^[A-Za-z_$][\w$]*$/u;
const BODY_CONTEXT_CHARS = 1200;

function normalizePath(raw) {
  return raw
    .replace(/^[`'"]/u, "")
    .replace(/[`'"]$/u, "")
    .replace(/\$\{(\w+)\}/gu, "{$1}");
}

export function* walkTs(dir) {
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

export function buildTypeAliasEnumMap(content) {
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

function bodyOfBlock(content, headerMatch) {
  const openBrace = content.indexOf("{", headerMatch.index + headerMatch[0].length - 1);
  if (openBrace < 0 || openBrace > headerMatch.index + headerMatch[0].length + 10) return null;
  let depth = 0;
  for (let i = openBrace; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) return content.slice(openBrace + 1, i);
    }
  }
  return null;
}

export function buildInterfaceFieldTypeMap(content) {
  const map = new Map();
  const headerRe = /(?:export\s+)?interface\s+(\w+)\s*(?:\{|extends)/gu;
  let m;
  while ((m = headerRe.exec(content)) !== null) {
    const body = bodyOfBlock(content, m);
    if (body === null) continue;
    const fieldTypeMap = new Map();
    const fieldRe = /^\s{2,6}(\w+)\??:\s*(?:Partial<)?([A-Z]\w*)(?:<[^>]*>)?(?:\[\])?/gmu;
    let fm;
    while ((fm = fieldRe.exec(body)) !== null) {
      fieldTypeMap.set(fm[1], fm[2]);
    }
    if (fieldTypeMap.size > 0) map.set(m[1], fieldTypeMap);
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

export function buildInterfaceMap(content) {
  const map = new Map();
  const headerRe = /(?:export\s+)?interface\s+(\w+)\s*(?:\{|extends)/gu;
  let m;
  while ((m = headerRe.exec(content)) !== null) {
    const body = bodyOfBlock(content, m);
    if (body === null) continue;
    const fields = new Set();
    const fieldRe = /^\s{2,6}(\w+)\??:/gmu;
    let fm;
    while ((fm = fieldRe.exec(body)) !== null) {
      fields.add(fm[1]);
    }
    if (fields.size > 0) map.set(m[1], fields);
  }

  const zodObjMap = buildZodObjectFieldMap(content);
  const inferRe = /\btype\s+(\w+)\s*=\s*z\.infer\s*<\s*typeof\s+(\w+)\s*>/gu;
  let im;
  while ((im = inferRe.exec(content)) !== null) {
    const fields = zodObjMap.get(im[2]);
    if (fields) map.set(im[1], new Set(fields));
  }

  return map;
}

export function collectTypeContent(hookDirs, featuresRoot) {
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

function skipQuoted(src, start) {
  const quote = src[start];
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === quote) return i + 1;
  }
  return src.length;
}

function skipTemplate(src, start) {
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === "`") return i + 1;
    if (c === "$" && src[i + 1] === "{") {
      let depth = 1;
      let j = i + 2;
      while (j < src.length && depth > 0) {
        const d = src[j];
        if (d === "'" || d === '"') j = skipQuoted(src, j);
        else if (d === "`") j = skipTemplate(src, j);
        else {
          if (d === "{") depth++;
          else if (d === "}") depth--;
          j++;
        }
      }
      i = j - 1;
    }
  }
  return src.length;
}

function findMatchingParen(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"') {
      i = skipQuoted(src, i) - 1;
      continue;
    }
    if (c === "`") {
      i = skipTemplate(src, i) - 1;
      continue;
    }
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevel(src) {
  const parts = [];
  let depth = 0;
  let last = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"') {
      i = skipQuoted(src, i) - 1;
      continue;
    }
    if (c === "`") {
      i = skipTemplate(src, i) - 1;
      continue;
    }
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      parts.push(src.slice(last, i));
      last = i + 1;
    }
  }
  parts.push(src.slice(last));
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

function skipGeneric(src, start) {
  let depth = 0;
  for (let i = start; i < src.length && i < start + 400; i++) {
    const c = src[i];
    if (c === "'" || c === '"') {
      i = skipQuoted(src, i) - 1;
      continue;
    }
    if (c === "`") {
      i = skipTemplate(src, i) - 1;
      continue;
    }
    if (c === "<") depth++;
    else if (c === ">") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function isComputedSegment(segment) {
  if (!segment.startsWith("{") || !segment.endsWith("}")) return false;
  const inner = segment.slice(1, -1);
  return !inner.endsWith("Id") && !inner.endsWith("id") && !inner.endsWith("Num");
}

function objectLiteralFields(expr) {
  if (!expr.startsWith("{") || !expr.endsWith("}")) return null;
  const fields = new Set();
  for (const seg of splitTopLevel(expr.slice(1, -1))) {
    if (seg.startsWith("...")) return null;
    const m = /^(\w+)\s*(?::|$)/u.exec(seg);
    if (!m) return null;
    fields.add(m[1]);
  }
  return fields.size > 0 ? fields : null;
}

function resolveIdentifierType(identifier, contextBefore) {
  const re = new RegExp(`\\b${identifier}\\s*:\\s*(Partial<)?([A-Z]\\w*)`, "gu");
  let found = null;
  let m;
  while ((m = re.exec(contextBefore)) !== null) found = m;
  if (!found) return null;
  return { typeName: found[2], isPartial: found[1] !== undefined };
}

/**
 * The body sits at argument index 1 and is NOT the last argument: `apiClient`
 * takes a config/signal and a response contract after it. Anchoring on the
 * closing paren is what silently unresolved every inline-object body when the
 * contract argument was introduced.
 */
function resolveBody(method, args, contextBefore, interfaceMap) {
  const empty = { bodyFields: null, bodyTypeName: null, isPartial: false };
  if (method === "GET") return empty;
  const expr = args[1];
  if (expr === undefined || expr === "undefined" || expr === "null") return empty;

  const literalFields = objectLiteralFields(expr);
  if (literalFields) return { bodyFields: literalFields, bodyTypeName: null, isPartial: false };

  if (!IDENT_RE.test(expr)) return empty;
  const resolved = resolveIdentifierType(expr, contextBefore);
  if (!resolved) return empty;
  const fields = interfaceMap.get(resolved.typeName);
  return {
    bodyFields: fields ? new Set(fields) : null,
    bodyTypeName: resolved.typeName,
    isPartial: resolved.isPartial,
  };
}

export function extractCallsFromSource(content, interfaceMap, file) {
  const calls = [];
  let skipped = 0;

  CALL_HEAD_RE.lastIndex = 0;
  let m;
  while ((m = CALL_HEAD_RE.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    const headEnd = m.index + m[0].length - 1;
    let parenIdx = headEnd;
    if (content[headEnd] === "<") {
      const afterGeneric = skipGeneric(content, headEnd);
      if (afterGeneric < 0) continue;
      parenIdx = content.indexOf("(", afterGeneric);
      if (parenIdx < 0 || content.slice(afterGeneric, parenIdx).trim() !== "") continue;
    }

    const closeIdx = findMatchingParen(content, parenIdx);
    if (closeIdx < 0) continue;
    const args = splitTopLevel(content.slice(parenIdx + 1, closeIdx));
    const first = args[0];
    if (!first || !/^[`'"]/u.test(first)) continue;

    const path = normalizePath(first);
    if (path.split("/").filter(Boolean).some(isComputedSegment)) {
      skipped++;
      continue;
    }

    const contextBefore = content.slice(Math.max(0, m.index - BODY_CONTEXT_CHARS), m.index);
    const { bodyFields, bodyTypeName, isPartial } = resolveBody(method, args, contextBefore, interfaceMap);

    calls.push({ method, path, bodyFields, bodyTypeName, isPartial, file });
  }

  return { calls, skipped };
}

export function extractFrontendCalls(hookDirs, interfaceMap) {
  const calls = [];
  let skipped = 0;

  for (const dir of hookDirs) {
    for (const file of walkTs(dir)) {
      const result = extractCallsFromSource(readFileSync(file, "utf8"), interfaceMap, file);
      calls.push(...result.calls);
      skipped += result.skipped;
    }
  }

  return { calls, skipped };
}
