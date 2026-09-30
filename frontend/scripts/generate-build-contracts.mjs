#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const FRONTEND_ROOT = fileURLToPath(new URL("..", import.meta.url));
const OPENAPI_PATH = join(FRONTEND_ROOT, "contracts", "openapi.json");
const OUTPUT_PATH = join(FRONTEND_ROOT, "contracts", "build-contracts.generated.ts");

function normalise(text) {
  return text.replace(/\r\n/g, "\n");
}

function sha256hex(content) {
  return createHash("sha256").update(normalise(content)).digest("hex");
}

function pointer(root, ref) {
  if (typeof ref !== "string" || !ref.startsWith("#/")) return undefined;
  let current = root;
  for (const rawSegment of ref.slice(2).split("/")) {
    const segment = rawSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (current == null || typeof current !== "object") return undefined;
    current = current[segment];
  }
  return current;
}

function deref(node, root) {
  let current = node;
  let hops = 0;
  while (current != null && typeof current === "object" && typeof current.$ref === "string" && hops < 8) {
    current = pointer(root, current.$ref);
    hops += 1;
  }
  return current;
}

function isNullBranch(node, root) {
  const r = deref(node, root);
  return r != null && typeof r === "object" && r.type === "null";
}

function zodForNode(node, root, depth) {
  if (node == null) return "z.unknown()";
  const n = deref(node, root);
  if (n == null) return "z.unknown()";

  if (n.anyOf || n.oneOf) {
    const branches = n.anyOf ?? n.oneOf;
    const nonNull = branches.filter((b) => !isNullBranch(b, root));
    if (nonNull.length === 0) return "z.null()";
    const hasNull = branches.length > nonNull.length;
    const inner =
      nonNull.length === 1
        ? zodForNode(nonNull[0], root, depth)
        : "z.union([" + nonNull.map((b) => zodForNode(b, root, depth)).join(", ") + "])";
    return hasNull ? inner + ".nullable()" : inner;
  }

  if (n.allOf) {
    const merged = { type: "object", properties: {}, required: [] };
    for (const part of n.allOf) {
      const r = deref(part, root);
      if (r == null || typeof r !== "object") continue;
      Object.assign(merged.properties, r.properties ?? {});
      merged.required.push(...(r.required ?? []));
    }
    Object.assign(merged.properties, n.properties ?? {});
    merged.required.push(...(n.required ?? []));
    return zodForNode(merged, root, depth);
  }

  if (Array.isArray(n.enum)) {
    return "z.enum([" + n.enum.map((m) => JSON.stringify(m)).join(", ") + "])";
  }

  if (n.type === "array" || n.items !== undefined) {
    const items = n.items != null ? zodForNode(n.items, root, depth) : "z.unknown()";
    const maxCap = typeof n.maxItems === "number" ? `.max(${n.maxItems})` : "";
    return `z.array(${items})${maxCap}`;
  }

  if (n.type === "object" || n.properties != null) {
    if (n.properties == null) {
      if (n.additionalProperties != null && typeof n.additionalProperties === "object") {
        return `z.record(z.string(), ${zodForNode(n.additionalProperties, root, depth)})`;
      }
      return "z.record(z.string(), z.unknown())";
    }
    const req = new Set(n.required ?? []);
    const pad = "  ".repeat(depth + 1);
    const close = "  ".repeat(depth);
    const fields = Object.entries(n.properties).map(([k, v]) => {
      const zod = zodForNode(v, root, depth + 1);
      const opt = req.has(k) ? "" : ".optional()";
      return `${pad}${k}: ${zod}${opt}`;
    });
    return `z.object({\n${fields.join(",\n")},\n${close}})`;
  }

  if (n.type === "integer") return "z.number().int()";
  if (n.type === "number") return "z.number()";
  if (n.type === "string") return "z.string()";
  if (n.type === "boolean") return "z.boolean()";
  if (n.type === "null") return "z.null()";

  return "z.unknown()";
}

function unwrapEnvelope(schema, root) {
  const n = deref(schema, root);
  if (n?.properties?.success != null && n?.properties?.data != null) return n.properties.data;
  return schema;
}

function getOperationResponseSchema(document, path, method) {
  const op = document.paths?.[path]?.[method];
  if (!op) return null;
  for (const code of ["200", "201"]) {
    const s = op.responses?.[code]?.content?.["application/json"]?.schema;
    if (s != null) return s;
  }
  return null;
}

const COVERED_OPERATIONS = [
  { export: "genProjectListPageSchema", path: "/build", method: "get" },
  { export: "genProjectRowSchema", path: "/build/{projectId}", method: "get" },
  { export: "genProjectAnalyticsSchema", path: "/build/{projectId}/analytics", method: "get" },
  { export: "genTicketListPageSchema", path: "/build/{projectId}/tickets", method: "get" },
  { export: "genTicketDetailWireSchema", path: "/build/{projectId}/tickets/{ticketId}", method: "get" },
  { export: "genCustomStateListSchema", path: "/build/{projectId}/custom-states", method: "get" },
  { export: "genCustomFieldListSchema", path: "/build/{projectId}/custom-fields", method: "get" },
  { export: "genBuildMemberPageSchema", path: "/build/{projectId}/members", method: "get" },
  { export: "genReleasePageSchema", path: "/build/{projectId}/releases", method: "get" },
  { export: "genWebhookPageSchema", path: "/build/{projectId}/webhooks", method: "get" },
  { export: "genAutomationPageSchema", path: "/build/{projectId}/automations", method: "get" },
  { export: "genTicketLabelListSchema", path: "/build/labels", method: "get" },
  { export: "genAllWorkPageSchema", path: "/build/all-work", method: "get" },
];

export function generateContent(document, openapiHash) {
  const segments = ['import { z } from "zod";', "", `export const OPENAPI_HASH = "sha256:${openapiHash}" as const;`, ""];
  for (const op of COVERED_OPERATIONS) {
    const rawSchema = getOperationResponseSchema(document, op.path, op.method);
    const dataSchema = rawSchema == null ? null : unwrapEnvelope(rawSchema, document);
    const zodCode = dataSchema == null ? "z.unknown()" : zodForNode(dataSchema, document, 0);
    segments.push(`export const ${op.export} = ${zodCode};`, "");
  }
  return segments.join("\n");
}

function main() {
  if (!existsSync(OPENAPI_PATH)) {
    console.error(`generate-build-contracts: contracts/openapi.json not found at ${OPENAPI_PATH}`);
    console.error("  Vendor it first: cp backend/openapi.json frontend/contracts/openapi.json");
    process.exit(1);
  }
  const raw = readFileSync(OPENAPI_PATH, "utf8");
  const hash = sha256hex(raw);
  const document = JSON.parse(raw);
  const content = generateContent(document, hash);
  writeFileSync(OUTPUT_PATH, content, "utf8");
  console.log(`Wrote contracts/build-contracts.generated.ts (openapi sha256: ${hash.slice(0, 16)}...)`);
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
