import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expand } from "./schema-diff.mjs";

export const UNIVERSAL_PRIVATE_COLUMNS = new Set([
  "orgId",
  "deletedAt",
]);

export const DB_SCHEMA_FLOOR = { files: 20, tables: 50 };

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      if (statSync(full).isDirectory()) { walkFiles(full, out); continue; }
    } catch { continue; }
    if (full.endsWith(".ts") && !full.endsWith(".spec.ts") && !full.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

export function parseTableDefs(source) {
  const tables = [];
  let current = null;
  let depth = 0;
  for (const line of source.split("\n")) {
    const m = /export\s+const\s+(\w+)\s*=\s*(?:\w+\.table|pgTable)\s*\(/.exec(line);
    if (m) {
      current = { varName: m[1], columns: [] };
      tables.push(current);
      depth = 0;
    }
    if (current !== null) {
      if (depth === 1) {
        const cm = /^\s+(\w+)\s*:\s*(text|integer|boolean|timestamp|jsonb|decimal|date|numeric|uuid|varchar|serial|smallint|bigint|real|doublePrecision|char|bytea|pgEnum|customType|interval|geometry|vector)\s*\(/.exec(line);
        if (cm) current.columns.push(cm[1]);
      }
      let opens = 0;
      let closes = 0;
      for (const ch of line) {
        if (ch === "{") opens += 1;
        else if (ch === "}") closes += 1;
      }
      depth += opens - closes;
      if (depth <= 0) {
        current = null;
        depth = 0;
      }
    }
  }
  return tables;
}

export function readDbSchema(backendRoot) {
  const schemaDir = join(backendRoot, "src", "db", "schema");
  if (!existsSync(schemaDir)) return { error: `backend DB schema directory not found: ${schemaDir}` };
  const files = walkFiles(schemaDir);
  if (files.length < DB_SCHEMA_FLOOR.files)
    return { error: `DB schema floor: only ${files.length} .ts files found in ${schemaDir}, expected ≥ ${DB_SCHEMA_FLOOR.files}` };
  const tables = new Map();
  for (const file of files) {
    for (const def of parseTableDefs(readFileSync(file, "utf8"))) {
      tables.set(def.varName, def.columns);
    }
  }
  if (tables.size < DB_SCHEMA_FLOOR.tables)
    return { error: `DB schema floor: only ${tables.size} table definitions parsed, expected ≥ ${DB_SCHEMA_FLOOR.tables}` };
  return { tables, files: files.length };
}

export function inferTableVarForRoute(routePattern, tables) {
  const segs = routePattern.split("/").filter(
    (s) => s.length > 0 && !s.startsWith("{") && !s.startsWith("*"),
  );
  if (segs.length === 0) return null;
  const last = segs[segs.length - 1];
  if (tables.has(last)) return last;
  if (last.endsWith("s") && tables.has(last.slice(0, -1))) return last.slice(0, -1);
  return null;
}

export function collectAllFieldNames(schema, root, maxDepth = 4) {
  const fields = new Set();
  function visit(node, d) {
    if (d > maxDepth) return;
    for (const n of expand(node, root)) {
      if (n.properties && typeof n.properties === "object") {
        for (const [name, child] of Object.entries(n.properties)) {
          fields.add(name);
          visit(child, d + 1);
        }
      }
      if (n.items !== undefined) visit(n.items, d + 1);
      if (n.additionalProperties !== undefined && typeof n.additionalProperties === "object") {
        visit(n.additionalProperties, d + 1);
      }
    }
  }
  visit(schema, 0);
  return fields;
}

export function checkDbCoverage(dbColumns, openApiFields, frontendFields, privateAllowlist) {
  const declared = new Set([...openApiFields, ...frontendFields]);
  return dbColumns.filter((col) => !declared.has(col) && !privateAllowlist.has(col));
}
