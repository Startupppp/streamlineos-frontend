#!/usr/bin/env node
/**
 * schema-roles — for every exported `const <name> = z.object(...)`, record the
 * ROLES the identifier is used in. A field with zero resolved property reads is
 * only a candidate for removal if none of these roles apply, because each of
 * them is a consumer TypeScript cannot see:
 *
 *   params        @Validate({ params: X })  -> read via @Param("name"), a string
 *                 literal, so no property access ever resolves to the field
 *   ai-schema     passed as `schema:` / `outputSchema:` / `parameters:` to an AI
 *                 gateway or tool definition -> the field IS the contract with
 *                 the model, and the parsed object is usually returned whole
 *   openapi       referenced from a response/`ApiResponse`/registry declaration
 *   env/config    parsed at boot and read through a differently typed accessor
 *   nested        the literal is an argument to another schema (z.array(...),
 *                 .extend(), a property assignment inside another z.object) —
 *                 its fields are reached through the PARENT's type, which the
 *                 checker resolves onto the CHILD literal only when the parent
 *                 type is actually navigated
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOT = "/Users/tarunchintakunta/Personal/streamline/streamlineos-backend";
const S = "/private/tmp/claude-501/-Users-tarunchintakunta-Personal-streamline/20eca33e-bd07-41a6-ac7b-f606f1ada0e1/scratchpad/t08";

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (e === "node_modules" || e === "dist") continue;
      walk(p, acc);
    } else if (e.endsWith(".ts") && !e.endsWith(".d.ts")) acc.push(p);
  }
  return acc;
}

const files = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "test"))].sort();
/** identifier name -> Set(roles) */
const roles = new Map();
const addRole = (name, role) => {
  if (!name) return;
  if (!roles.has(name)) roles.set(name, new Set());
  roles.get(name).add(role);
};

const SCHEMA_PROP_KEYS = new Set([
  "schema", "outputSchema", "inputSchema", "responseSchema", "parameters",
  "resultSchema", "argsSchema", "payloadSchema", "shape", "zodSchema",
]);

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
      const callee = node.expression.expression;
      if (ts.isIdentifier(callee) && callee.text === "Validate" && node.expression.arguments.length) {
        const arg = node.expression.arguments[0];
        if (ts.isObjectLiteralExpression(arg)) {
          for (const p of arg.properties) {
            if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) continue;
            const slot = p.name.text; // body | query | params
            const init = p.initializer;
            const base = ts.isIdentifier(init) ? init.text : rootIdent(init);
            addRole(base, `validate:${slot}`);
          }
        }
      }
    }
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && SCHEMA_PROP_KEYS.has(node.name.text)) {
      const base = ts.isIdentifier(node.initializer) ? node.initializer.text : rootIdent(node.initializer);
      addRole(base, `schemaprop:${node.name.text}`);
    }
    ts.forEachChild(node, visit);
  };
  function rootIdent(n) {
    // unwrap  X.partial()  /  X.optional()  /  X.array()  chains back to X
    let cur = n;
    for (let i = 0; i < 12 && cur; i++) {
      if (ts.isIdentifier(cur)) return cur.text;
      if (ts.isCallExpression(cur)) { cur = cur.expression; continue; }
      if (ts.isPropertyAccessExpression(cur)) { cur = cur.expression; continue; }
      return null;
    }
    return null;
  }
  visit(sf);
}

const out = {};
for (const [k, v] of roles) out[k] = [...v];
writeFileSync(`${S}/schema-roles.json`, JSON.stringify(out, null, 1));
console.log(`identifiers with a non-TypeScript consumer role: ${roles.size}`);
const tally = {};
for (const v of roles.values()) for (const r of v) tally[r] = (tally[r] || 0) + 1;
console.log(JSON.stringify(tally, null, 1));
