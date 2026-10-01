#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  LEGACY_ALIASES,
  buildFromDisk,
  generateContent,
  normaliseRequestPath,
  resolveHookOperations,
  responseDataSchema,
  scanSourceForRequests,
  sha256hex,
  zodFor,
} from "./generate-build-contracts.mjs";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const OPENAPI_PATH = join(FRONTEND_ROOT, "contracts", "openapi.json");
const GENERATED_PATH = join(FRONTEND_ROOT, "contracts", "build-contracts.generated.ts");

const MIN_SCHEMAS = 300;

function normalise(text) {
  return text.replace(/\r\n/g, "\n");
}

export function extractOpenapiHash(source) {
  const match = source.match(/OPENAPI_HASH = "sha256:([0-9a-f]{64})" as const/);
  return match ? match[1] : null;
}

export function countGeneratedSchemas(source) {
  return [...source.matchAll(/^export const \w+(?:Response|Body)Schema = /gm)].length;
}

export function missingLegacyAliases(source) {
  return LEGACY_ALIASES.map(([alias]) => alias).filter((alias) => !new RegExp(`^export const ${alias} = `, "m").test(source));
}

export function checkWellFormed(source, minSchemas = MIN_SCHEMAS) {
  const hash = extractOpenapiHash(source);
  if (hash === null) return { ok: false, reason: "no OPENAPI_HASH constant found" };
  const count = countGeneratedSchemas(source);
  if (count < minSchemas) return { ok: false, reason: `only ${count} schemas, below the floor of ${minSchemas}` };
  const missing = missingLegacyAliases(source);
  if (missing.length > 0) return { ok: false, reason: `legacy aliases missing: ${missing.join(", ")}` };
  return { ok: true, hash, count };
}

const ctx = (root = {}) => ({ root, definitions: [], expanding: new Set(), mode: "response" });

function evaluate(code) {
  return new Function("z", `return ${code};`)(z);
}

function runSelfTest() {
  const cases = [];
  const assert = (description, passes) => cases.push({ description, passes });
  const throws = (fn) => {
    try {
      fn();
      return false;
    } catch {
      return true;
    }
  };

  const validHash = "a".repeat(64);
  const aliasLines = LEGACY_ALIASES.map(([alias]) => `export const ${alias} = fooResponseSchema;\n`).join("");
  const makeSource = (n = MIN_SCHEMAS, aliases = aliasLines) =>
    `export const OPENAPI_HASH = "sha256:${validHash}" as const;\n` +
    Array.from({ length: n }, (_, i) => `export const foo${i}ResponseSchema = z.unknown();\n`).join("") +
    aliases;

  assert(
    "extracts a valid 64-character sha256 hex hash from the OPENAPI_HASH export",
    extractOpenapiHash(`export const OPENAPI_HASH = "sha256:${validHash}" as const;`) === validHash,
  );
  assert("returns null when no OPENAPI_HASH constant is present", extractOpenapiHash("no hash here") === null);
  assert(
    "rejects a hash shorter than 64 hex characters so a truncated write cannot pass",
    extractOpenapiHash(`export const OPENAPI_HASH = "sha256:abc" as const;`) === null,
  );
  assert(
    "counts response and body schema exports but not legacy aliases or types",
    countGeneratedSchemas("export const aResponseSchema = x;\nexport const bBodySchema = y;\nexport const genXSchema = a;\nexport type AResponse = z.infer<typeof a>;\n") === 2,
  );
  assert("counts zero schemas in an empty file so a blank file cannot pass", countGeneratedSchemas("") === 0);
  assert("a file at the schema floor with a hash and every legacy alias is well-formed", checkWellFormed(makeSource()).ok);
  assert(
    "a file below the schema floor is malformed so a truncated generate cannot pass",
    checkWellFormed(makeSource(MIN_SCHEMAS - 1)).ok === false,
  );
  assert(
    "a file that drops a legacy alias is malformed so an existing hook import cannot silently break",
    checkWellFormed(makeSource(MIN_SCHEMAS, aliasLines.split("\n").slice(1).join("\n"))).ok === false,
  );
  assert(
    "a file with no OPENAPI_HASH is malformed even if it has enough schemas",
    checkWellFormed(makeSource().split("\n").slice(1).join("\n")).ok === false,
  );

  const stringEnum = zodFor({ type: "string", enum: ["draft", "released"] }, ctx());
  assert("a string enum becomes z.enum, never z.string", stringEnum === 'z.enum(["draft", "released"])');
  const nullableEnum = zodFor({ anyOf: [{ type: "string", enum: ["a", "b"] }, { type: "null" }] }, ctx());
  assert("an anyOf enum-or-null becomes a nullable z.enum", nullableEnum === 'z.enum(["a", "b"]).nullable()');
  const nullableEnumSchema = evaluate(nullableEnum);
  assert(
    "the emitted nullable enum accepts null and a member and rejects an outsider",
    nullableEnumSchema.safeParse(null).success && nullableEnumSchema.safeParse("a").success && !nullableEnumSchema.safeParse("c").success,
  );
  assert(
    "an enum that lists null as a member becomes a nullable enum",
    zodFor({ type: ["string", "null"], enum: ["x", "y", null] }, ctx()) === 'z.enum(["x", "y"]).nullable()',
  );
  assert("OpenAPI 3.0 nullable:true is honoured", zodFor({ type: "string", nullable: true }, ctx()) === "z.string().nullable()");
  assert("a const becomes a literal", zodFor({ type: "boolean", const: true }, ctx()) === "z.literal(true)");
  assert("an integer becomes z.number().int()", zodFor({ type: "integer", minimum: -9, maximum: 9 }, ctx()) === "z.number().int()");
  assert(
    "a date-time string is declared as an ISO datetime",
    zodFor({ type: "string", format: "date-time" }, ctx()) === "z.iso.datetime({ offset: true })",
  );
  const record = zodFor({ type: "object", propertyNames: { type: "string" }, additionalProperties: { type: "integer" } }, ctx());
  assert("additionalProperties without properties becomes a string-keyed record", record === "z.record(z.string(), z.number().int())");
  assert(
    "the emitted record accepts integer values and rejects strings",
    evaluate(record).safeParse({ a: 1 }).success && !evaluate(record).safeParse({ a: "1" }).success,
  );
  const enumKeyed = zodFor(
    { type: "object", propertyNames: { type: "string", enum: ["low", "high"] }, additionalProperties: { type: "number" } },
    ctx(),
  );
  assert("an enum-keyed record that does not require every key is partial", enumKeyed === 'z.partialRecord(z.enum(["low", "high"]), z.number())');
  const union = zodFor(
    {
      anyOf: [
        { type: "object", properties: { kind: { type: "string", const: "a" } }, required: ["kind"] },
        { type: "object", properties: { kind: { type: "string", const: "b" }, n: { type: "integer" } }, required: ["kind", "n"] },
      ],
    },
    ctx(),
  );
  const unionSchema = evaluate(union);
  assert("an anyOf of two objects becomes a z.union of both", union.startsWith("z.union([z.object("));
  assert(
    "the emitted union accepts each branch and rejects a value matching neither",
    unionSchema.safeParse({ kind: "a" }).success && unionSchema.safeParse({ kind: "b", n: 1 }).success && !unionSchema.safeParse({ kind: "c" }).success,
  );
  const optionalVsNullable = evaluate(
    zodFor(
      { type: "object", properties: { a: { anyOf: [{ type: "string" }, { type: "null" }] }, b: { type: "string" } }, required: ["a"] },
      ctx(),
    ),
  );
  assert(
    "a required nullable field rejects absence while a non-required field accepts it",
    optionalVsNullable.safeParse({ a: null }).success && !optionalVsNullable.safeParse({ b: "x" }).success,
  );
  assert(
    "response objects strip unknown keys while request bodies with additionalProperties:false are strict",
    zodFor({ type: "object", properties: {}, additionalProperties: false }, ctx()) === "z.object({})" &&
      zodFor({ type: "object", properties: {}, additionalProperties: false }, { ...ctx(), mode: "body" }) === "z.strictObject({})",
  );
  assert(
    "allOf of objects merges their properties and requirements",
    zodFor(
      { allOf: [{ type: "object", properties: { a: { type: "string" } }, required: ["a"] }, { type: "object", properties: { b: { type: "boolean" } } }] },
      ctx(),
    ) === "z.object({\n  a: z.string(),\n  b: z.boolean().optional(),\n})",
  );
  assert(
    "a recursive local $ref fails generation loudly instead of emitting z.unknown",
    throws(() => zodFor({ definitions: { n: { type: "object", properties: { c: { $ref: "#/definitions/n" } } } }, $ref: "#/definitions/n" }, ctx())),
  );
  const envelope = {
    responses: {
      "200": {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", const: true },
                data: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { type: "integer" } },
                    pagination: {
                      type: "object",
                      properties: { limit: { type: "integer" }, hasMore: { type: "boolean" }, nextCursor: { anyOf: [{ type: "string" }, { type: "null" }] } },
                      required: ["limit", "hasMore", "nextCursor"],
                    },
                  },
                  required: ["data", "pagination"],
                },
              },
              required: ["success", "data"],
            },
          },
        },
      },
    },
  };
  const page = evaluate(zodFor(responseDataSchema(envelope, {}), ctx()));
  assert(
    "the success envelope is unwrapped and a cursor page keeps a nullable nextCursor",
    page.safeParse({ data: [1], pagination: { limit: 1, hasMore: false, nextCursor: null } }).success &&
      !page.safeParse({ data: [1], pagination: { limit: 1, hasMore: false } }).success,
  );

  assert(
    "a template path normalises parameters to placeholders and drops a glued query suffix",
    normaliseRequestPath("/build/{}/tickets{}") === "/build/{}/tickets" && normaliseRequestPath("/public/roadmap/vote?org={}") === "/public/roadmap/vote",
  );
  assert("a non-path string is not a request path", normaliseRequestPath("hooks/api/index.ts") === null);
  const scanned = scanSourceForRequests(
    "const a = apiClient.get<Foo<Bar>>(`/build/${projectId}/releases/${releaseId ?? 0}`, signal);\nconst p = `/public/forms/${token}`;",
  );
  assert(
    "an apiClient call yields its method and normalised path, and a bare path literal is collected separately",
    scanned.calls.length === 1 && scanned.calls[0].method === "get" && scanned.calls[0].path === "/build/{}/releases/{}" && scanned.loose[0] === "/public/forms/{}",
  );
  const doc = {
    paths: {
      "/build/{projectId}/releases/{releaseId}": { get: { operationId: "R_get" }, delete: { operationId: "R_delete" } },
      "/build/widgets": { get: { operationId: "W_org" } },
    },
  };
  const resolved = resolveHookOperations(doc, ["apiClient.get(`/build/${p}/releases/${r}`); apiClient.post(`/build/${p}/nowhere`);"]);
  assert(
    "a hook call resolves to its parameterised operation only for the method it uses",
    resolved.operations.some((o) => o.operationId === "R_get") && !resolved.operations.some((o) => o.operationId === "R_delete"),
  );
  assert("a hook call with no backend operation is reported as unmatched", resolved.unmatched.includes("post /build/{}/nowhere"));
  const shared = resolveHookOperations(doc, [], ["apiClient.get(`/build/${p}/releases/${r}`); apiClient.get(`/chat/${c}`);"]);
  assert(
    "a Build call from a hook module outside hooks/api/build is covered while its non-Build calls are not",
    shared.operations.some((o) => o.operationId === "R_get") && !shared.unmatched.some((u) => u.includes("/chat/")),
  );
  assert(
    "a parameter placeholder never matches a literal segment",
    !resolveHookOperations(doc, ["apiClient.get(`/build/${x}`);"]).operations.some((o) => o.operationId === "W_org"),
  );
  assert(
    "generation refuses to emit a file that would drop a legacy alias still imported by a hook schema",
    (() => {
      const d = { paths: { "/x": { get: { operationId: "X_get", responses: { "200": { content: { "application/json": { schema: { type: "string" } } } } } } } } };
      const ops = [{ method: "get", path: "/x", operationId: "X_get" }];
      return throws(() => generateContent(d, validHash, ops));
    })(),
  );
  assert(
    "the committed generated file passes rule 1 on this checkout",
    existsSync(GENERATED_PATH) && checkWellFormed(readFileSync(GENERATED_PATH, "utf8")).ok,
  );

  const failures = cases.filter((c) => !c.passes);
  for (const c of cases) if (c.passes) console.log(`OK   self-test passed: ${c.description}`);
  for (const f of failures) console.error(`FAIL self-test FAILED: ${f.description}`);
  if (failures.length > 0) process.exit(1);
  console.log(`\nAll ${cases.length} self-test cases passed — check-build-contracts is live.`);
  process.exit(0);
}

if (process.argv.includes("--self-test")) runSelfTest();

if (!existsSync(GENERATED_PATH)) {
  console.error("check:build-contracts FAILED — contracts/build-contracts.generated.ts is missing.");
  console.error("  Run: pnpm generate:build-contracts");
  process.exit(1);
}

const generatedSource = readFileSync(GENERATED_PATH, "utf8");
const wellFormed = checkWellFormed(generatedSource);
if (!wellFormed.ok) {
  console.error(`check:build-contracts FAILED — generated file is malformed: ${wellFormed.reason}`);
  console.error("  Run: pnpm generate:build-contracts");
  process.exit(1);
}
console.log(`rule 1 OK — ${wellFormed.count} generated schemas, OPENAPI_HASH and every legacy alias present.`);

if (!existsSync(OPENAPI_PATH)) {
  console.error("INCONCLUSIVE — check:build-contracts: contracts/openapi.json not found.");
  console.error("  Vendor it: cp backend/openapi.json frontend/contracts/openapi.json");
  process.exit(2);
}

const currentHash = sha256hex(readFileSync(OPENAPI_PATH, "utf8"));
if (currentHash !== wellFormed.hash) {
  console.error("check:build-contracts FAILED — contracts/build-contracts.generated.ts is STALE.");
  console.error("  The vendored openapi.json changed since the last generate:build-contracts run.");
  console.error(`  embedded hash: ${wellFormed.hash.slice(0, 16)}...`);
  console.error(`  current hash:  ${currentHash.slice(0, 16)}...`);
  console.error("  Run: pnpm generate:build-contracts");
  process.exit(1);
}
console.log(`rule 2 OK — OPENAPI_HASH matches contracts/openapi.json (${currentHash.slice(0, 12)}...)`);

const fresh = buildFromDisk();
if (normalise(fresh.content) !== normalise(generatedSource)) {
  console.error("check:build-contracts FAILED — the generated file does not match a fresh generation.");
  console.error("  A Build hook now calls a different set of operations, or the file was edited by hand.");
  console.error("  Run: pnpm generate:build-contracts");
  process.exit(1);
}
console.log(`rule 3 OK — the file equals a fresh generation over ${fresh.operations.length} hook-called operations.`);
for (const call of fresh.unmatched) console.warn(`  note: no backend operation for hook request ${call}`);
process.exit(0);
