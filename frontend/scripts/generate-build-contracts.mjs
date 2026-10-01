#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const OPENAPI_PATH = join(FRONTEND_ROOT, "contracts", "openapi.json");
const OUTPUT_PATH = join(FRONTEND_ROOT, "contracts", "build-contracts.generated.ts");
export const HOOKS_ROOT = join(FRONTEND_ROOT, "hooks", "api", "build");
const SHARED_HOOKS_ROOT = join(FRONTEND_ROOT, "hooks", "api");

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];
const SUCCESS_CODES = ["200", "201", "202"];
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;


function normalise(text) {
  return text.replace(/\r\n/g, "\n");
}

export function sha256hex(content) {
  return createHash("sha256").update(normalise(content)).digest("hex");
}

function sourceFiles(dir) {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return name === "__tests__" ? [] : sourceFiles(full);
      return /\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) ? [full] : [];
    });
}

function readLiteral(src, start) {
  const quote = src[start];
  let out = "";
  let i = start + 1;
  while (i < src.length && src[i] !== quote) {
    if (quote !== "`" && src[i] === "\n") return { text: "", end: i };
    if (src[i] === "\\") {
      out += src[i + 1];
      i += 2;
    } else if (quote === "`" && src[i] === "$" && src[i + 1] === "{") {
      let depth = 1;
      i += 2;
      while (i < src.length && depth > 0) {
        if (src[i] === "{") depth += 1;
        else if (src[i] === "}") depth -= 1;
        else if (src[i] === "`") i = readLiteral(src, i).end - 1;
        i += 1;
      }
      out += "{}";
    } else {
      out += src[i];
      i += 1;
    }
  }
  return { text: out, end: i + 1 };
}

export function normaliseRequestPath(text) {
  if (!text.startsWith("/")) return null;
  const withoutQuery = text.split("?")[0];
  const segments = withoutQuery.split("/").slice(1);
  const out = [];
  for (const [index, segment] of segments.entries()) {
    if (segment === "{}") out.push("{}");
    else if (segment.includes("{}")) {
      const literal = segment.split("{}")[0];
      if (index !== segments.length - 1 || literal === "") return null;
      out.push(literal);
    } else if (segment !== "") out.push(segment);
    else if (index !== segments.length - 1) return null;
  }
  if (out.length === 0 || out.some((s) => !/^[A-Za-z0-9._~{}-]+$/.test(s))) return null;
  return "/" + out.join("/");
}

export function scanSourceForRequests(src) {
  const calls = [];
  const loose = [];
  const consumed = new Set();
  const callRe = /apiClient\s*\.\s*(get|post|put|patch|delete)\s*(<)?/g;
  let match;
  while ((match = callRe.exec(src))) {
    let i = callRe.lastIndex;
    if (match[2]) {
      let depth = 1;
      while (depth > 0 && i < src.length) {
        if (src[i] === "<") depth += 1;
        else if (src[i] === ">" && src[i - 1] !== "=") depth -= 1;
        i += 1;
      }
    }
    while (/\s/.test(src[i])) i += 1;
    if (src[i] !== "(") continue;
    i += 1;
    while (/\s/.test(src[i])) i += 1;
    if (!["`", '"', "'"].includes(src[i])) continue;
    const literal = readLiteral(src, i);
    consumed.add(i);
    const path = normaliseRequestPath(literal.text);
    if (path) calls.push({ method: match[1], path });
  }
  const literalRe = /[`"']/g;
  while ((match = literalRe.exec(src))) {
    const start = match.index;
    const literal = readLiteral(src, start);
    literalRe.lastIndex = literal.end;
    if (consumed.has(start)) continue;
    const path = normaliseRequestPath(literal.text);
    if (path) loose.push(path);
  }
  return { calls, loose };
}

function pathMatches(templatePath, requestPath) {
  const a = templatePath.split("/");
  const b = requestPath.split("/");
  if (a.length !== b.length) return false;
  return a.every((segment, i) => (segment.startsWith("{") ? b[i] === "{}" : segment === b[i]));
}

export function resolveHookOperations(document, sources, sharedSources = []) {
  const wanted = new Map();
  const unmatched = new Set();
  const paths = Object.keys(document.paths ?? {});
  const want = (path, method) => {
    const op = document.paths[path]?.[method];
    if (op) wanted.set(`${method} ${path}`, { method, path, operationId: op.operationId });
  };
  for (const src of sources) {
    const { calls, loose } = scanSourceForRequests(src);
    for (const call of calls) {
      const hits = paths.filter((p) => pathMatches(p, call.path) && document.paths[p][call.method]);
      if (hits.length === 0) unmatched.add(`${call.method} ${call.path}`);
      for (const p of hits) want(p, call.method);
    }
    for (const requestPath of loose) {
      for (const p of paths.filter((candidate) => pathMatches(candidate, requestPath))) {
        for (const method of HTTP_METHODS) want(p, method);
      }
    }
  }
  for (const src of sharedSources) {
    for (const call of scanSourceForRequests(src).calls) {
      if (!call.path.startsWith("/build/") && call.path !== "/build") continue;
      const hits = paths.filter((p) => pathMatches(p, call.path) && document.paths[p][call.method]);
      if (hits.length === 0) unmatched.add(`${call.method} ${call.path}`);
      for (const p of hits) want(p, call.method);
    }
  }
  const operations = [...wanted.values()].sort((x, y) =>
    x.path === y.path ? HTTP_METHODS.indexOf(x.method) - HTTP_METHODS.indexOf(y.method) : x.path < y.path ? -1 : 1,
  );
  return { operations, unmatched: [...unmatched].sort() };
}

export function readHookSources(root = HOOKS_ROOT) {
  return sourceFiles(root).map((file) => readFileSync(file, "utf8"));
}

export function readSharedHookSources() {
  return sourceFiles(SHARED_HOOKS_ROOT)
    .filter((file) => !file.startsWith(HOOKS_ROOT))
    .map((file) => readFileSync(file, "utf8"));
}

export function exportBase(operationId) {
  const [controller, method] = operationId.split("_");
  const head = controller.replace(/Controller$/, "");
  const raw = head.charAt(0).toLowerCase() + head.slice(1) + method.charAt(0).toUpperCase() + method.slice(1);
  return raw.replace(/[^A-Za-z0-9]/g, "");
}

function pascal(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function pointer(root, ref) {
  let current = root;
  for (const rawSegment of ref.slice(2).split("/")) {
    const segment = rawSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (current == null || typeof current !== "object") return undefined;
    current = current[segment];
  }
  return current;
}

function resolveRef(node, ctx) {
  const ref = node.$ref;
  if (ref.startsWith("#/definitions/")) {
    const name = ref.slice("#/definitions/".length);
    for (let i = ctx.definitions.length - 1; i >= 0; i -= 1) {
      if (ctx.definitions[i][name] !== undefined) return ctx.definitions[i][name];
    }
    throw new Error(`unresolvable local $ref ${ref}`);
  }
  if (ref.startsWith("#/")) {
    const target = pointer(ctx.root, ref);
    if (target === undefined) throw new Error(`unresolvable $ref ${ref}`);
    return target;
  }
  throw new Error(`external $ref ${ref} is not supported`);
}

function literal(value) {
  return `z.literal(${JSON.stringify(value)})`;
}

function enumCode(values) {
  const nonNull = values.filter((v) => v !== null);
  const nullable = nonNull.length < values.length;
  let code;
  if (nonNull.length === 0) return "z.null()";
  if (nonNull.length === 1) code = literal(nonNull[0]);
  else if (nonNull.every((v) => typeof v === "string")) code = `z.enum([${nonNull.map((v) => JSON.stringify(v)).join(", ")}])`;
  else code = `z.union([${nonNull.map(literal).join(", ")}])`;
  return nullable ? `${code}.nullable()` : code;
}

function stringCode(node) {
  if (node.format === "date-time") return "z.iso.datetime({ offset: true })";
  if (node.format === "date") return "z.iso.date()";
  return "z.string()";
}

function isNullNode(node) {
  return node != null && typeof node === "object" && (node.type === "null" || (Array.isArray(node.enum) && node.enum.length === 1 && node.enum[0] === null));
}

function pad(depth) {
  return "  ".repeat(depth);
}

function propertyKey(key) {
  return IDENTIFIER_RE.test(key) ? key : JSON.stringify(key);
}

function objectCode(node, ctx, depth) {
  const properties = node.properties ?? {};
  const keys = Object.keys(properties);
  const extra = node.additionalProperties;
  const hasExtraSchema = extra != null && typeof extra === "object" && Object.keys(extra).length > 0;
  if (keys.length === 0 && node.properties === undefined) {
    const valueCode = hasExtraSchema ? zodFor(extra, ctx, depth) : "z.unknown()";
    const names = node.propertyNames;
    const keyCode = names && (Array.isArray(names.enum) || names.const !== undefined || names.$ref) ? zodFor(names, ctx, depth) : "z.string()";
    const exhaustive = Array.isArray(names?.enum) && names.enum.every((k) => (node.required ?? []).includes(k));
    return `z.${keyCode === "z.string()" || exhaustive ? "record" : "partialRecord"}(${keyCode}, ${valueCode})`;
  }
  const required = new Set(node.required ?? []);
  const fields = keys.map((key) => {
    const code = zodFor(properties[key], ctx, depth + 1);
    return `${pad(depth + 1)}${propertyKey(key)}: ${code}${required.has(key) ? "" : ".optional()"},`;
  });
  const factory = extra === true || (extra != null && typeof extra === "object" && !hasExtraSchema)
    ? "z.looseObject"
    : ctx.mode === "body" && extra === false
      ? "z.strictObject"
      : "z.object";
  const body = fields.length === 0 ? "{}" : `{\n${fields.join("\n")}\n${pad(depth)}}`;
  const catchall = hasExtraSchema ? `.catchall(${zodFor(extra, ctx, depth)})` : "";
  return `${factory}(${body})${catchall}`;
}

function unionCode(branches, ctx, depth) {
  const nonNull = branches.filter((b) => !isNullNode(b.$ref ? resolveRef(b, ctx) : b));
  const nullable = nonNull.length < branches.length;
  if (nonNull.length === 0) return "z.null()";
  const parts = [...new Set(nonNull.map((b) => zodFor(b, ctx, depth)))];
  const code = parts.length === 1 ? parts[0] : `z.union([${parts.join(", ")}])`;
  return nullable ? `${code}.nullable()` : code;
}

function allOfCode(node, ctx, depth) {
  const parts = node.allOf.map((part) => (part.$ref ? resolveRef(part, ctx) : part));
  const ownKeys = Object.keys(node).filter((k) => k !== "allOf");
  if (ownKeys.length > 0) parts.push(Object.fromEntries(ownKeys.map((k) => [k, node[k]])));
  if (parts.every((p) => p.type === "object" || p.properties)) {
    const merged = { type: "object", properties: {}, required: [] };
    for (const p of parts) {
      Object.assign(merged.properties, p.properties ?? {});
      merged.required.push(...(p.required ?? []));
      if (p.additionalProperties !== undefined) merged.additionalProperties = p.additionalProperties;
    }
    return objectCode(merged, ctx, depth);
  }
  return parts.map((p) => zodFor(p, ctx, depth)).reduce((acc, code) => `z.intersection(${acc}, ${code})`);
}

function typedCode(node, type, ctx, depth) {
  if (type === "string") return stringCode(node);
  if (type === "integer") return "z.number().int()";
  if (type === "number") return "z.number()";
  if (type === "boolean") return "z.boolean()";
  if (type === "null") return "z.null()";
  if (type === "array") {
    if (Array.isArray(node.prefixItems) || Array.isArray(node.items)) {
      const items = node.prefixItems ?? node.items;
      return `z.tuple([${items.map((i) => zodFor(i, ctx, depth)).join(", ")}])`;
    }
    return `z.array(${node.items != null ? zodFor(node.items, ctx, depth) : "z.unknown()"})`;
  }
  if (type === "object") return objectCode(node, ctx, depth);
  return "z.unknown()";
}

export function zodFor(input, ctx, depth = 0) {
  if (input == null || input === true) return "z.unknown()";
  if (input === false) return "z.never()";
  let node = input;
  if (node.definitions) ctx = { ...ctx, definitions: [...ctx.definitions, node.definitions] };
  if (node.$ref) {
    if (ctx.expanding.has(node.$ref)) throw new Error(`recursive schema ${node.$ref} cannot be expressed without a named lazy type`);
    const target = resolveRef(node, ctx);
    return zodFor(target, { ...ctx, expanding: new Set([...ctx.expanding, node.$ref]) }, depth);
  }
  let code;
  if (node.anyOf || node.oneOf) code = unionCode(node.anyOf ?? node.oneOf, ctx, depth);
  else if (node.allOf) code = allOfCode(node, ctx, depth);
  else if (node.const !== undefined) code = literal(node.const);
  else if (Array.isArray(node.enum)) code = enumCode(node.enum);
  else if (Array.isArray(node.type)) {
    const types = node.type.filter((t) => t !== "null");
    const inner = types.map((t) => typedCode(node, t, ctx, depth));
    code = inner.length === 0 ? "z.null()" : inner.length === 1 ? inner[0] : `z.union([${inner.join(", ")}])`;
    if (types.length > 0 && types.length < node.type.length) code += ".nullable()";
  } else if (node.type) code = typedCode(node, node.type, ctx, depth);
  else if (node.properties || node.additionalProperties !== undefined) code = objectCode(node, ctx, depth);
  else if (node.items) code = typedCode(node, "array", ctx, depth);
  else code = "z.unknown()";
  if (node.nullable === true && !code.endsWith(".nullable()") && code !== "z.null()") code += ".nullable()";
  return code;
}

function jsonSchemaOf(content) {
  return content?.["application/json"]?.schema;
}

export function responseDataSchema(operation, root) {
  for (const code of SUCCESS_CODES) {
    const schema = jsonSchemaOf(operation.responses?.[code]?.content);
    if (schema == null) continue;
    const resolved = schema.$ref ? pointer(root, schema.$ref) : schema;
    const props = resolved?.properties;
    if (props?.success !== undefined && props?.data !== undefined && (resolved.required ?? []).includes("data")) return props.data;
    return schema;
  }
  return null;
}

export function generateContent(document, openapiHash, operations) {
  const segments = ['import { z } from "zod";', "", `export const OPENAPI_HASH = "sha256:${openapiHash}" as const;`, ""];
  const seen = new Set();
  const index = [];
  for (const { method, path, operationId } of operations) {
    const operation = document.paths[path][method];
    const base = exportBase(operationId);
    if (seen.has(base)) throw new Error(`export name collision for ${operationId}`);
    seen.add(base);
    const ctx = { root: document, definitions: [], expanding: new Set(), mode: "response" };
    const entry = { operationId, method: method.toUpperCase(), path };
    const data = responseDataSchema(operation, document);
    if (data != null) {
      entry.response = `${base}ResponseSchema`;
      segments.push(`export const ${entry.response} = ${zodFor(data, ctx)};`);
      segments.push(`export type ${pascal(base)}Response = z.infer<typeof ${entry.response}>;`, "");
    }
    const body = jsonSchemaOf(operation.requestBody?.content);
    if (body != null) {
      entry.body = `${base}BodySchema`;
      segments.push(`export const ${entry.body} = ${zodFor(body, { ...ctx, mode: "body" })};`);
      segments.push(`export type ${pascal(base)}Body = z.input<typeof ${entry.body}>;`, "");
    }
    index.push(entry);
  }
  segments.push("", "export const BUILD_CONTRACT_OPERATIONS = [");
  for (const e of index) {
    const fields = [`operationId: ${JSON.stringify(e.operationId)}`, `method: ${JSON.stringify(e.method)}`, `path: ${JSON.stringify(e.path)}`];
    if (e.response) fields.push(`response: ${JSON.stringify(e.response)}`);
    if (e.body) fields.push(`body: ${JSON.stringify(e.body)}`);
    segments.push(`  { ${fields.join(", ")} },`);
  }
  segments.push("] as const;", "");
  return segments.join("\n");
}

export function buildFromDisk() {
  const raw = readFileSync(OPENAPI_PATH, "utf8");
  const hash = sha256hex(raw);
  const document = JSON.parse(raw);
  const { operations, unmatched } = resolveHookOperations(document, readHookSources(), readSharedHookSources());
  return { hash, operations, unmatched, content: generateContent(document, hash, operations) };
}

function main() {
  if (!existsSync(OPENAPI_PATH)) {
    console.error(`generate-build-contracts: contracts/openapi.json not found at ${OPENAPI_PATH}`);
    console.error("  Vendor it first: cp backend/openapi.json frontend/contracts/openapi.json");
    process.exit(1);
  }
  const { hash, operations, unmatched, content } = buildFromDisk();
  writeFileSync(OUTPUT_PATH, content, "utf8");
  console.log(`Wrote ${relative(FRONTEND_ROOT, OUTPUT_PATH)}: ${operations.length} operations (openapi sha256: ${hash.slice(0, 16)}...)`);
  for (const call of unmatched) console.warn(`  no backend operation for hook request ${call}`);
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
