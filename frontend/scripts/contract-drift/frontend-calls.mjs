import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const API_RE = /apiClient\.(get|post|put|patch|delete)<[^>]*?>\s*\(\s*(`[^`]*`|'[^']*'|"[^"]*")/gu;
const INLINE_OBJ_RE = /^,\s*\{\s*((?:\w+\s*,\s*)*\w+)\s*\},?\s*\)/u;
const BODY_PARAM_RE_G = /\b(?:data|input|body|payload)\s*:\s*(Partial<)?([A-Z]\w+)(?:>)?\b/gu;

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

function isComputedSegment(segment) {
  if (!segment.startsWith("{") || !segment.endsWith("}")) return false;
  const inner = segment.slice(1, -1);
  return !inner.endsWith("Id") && !inner.endsWith("id") && !inner.endsWith("Num");
}

export function extractFrontendCalls(hookDirs, interfaceMap) {
  const calls = [];
  let skipped = 0;

  for (const dir of hookDirs) {
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
