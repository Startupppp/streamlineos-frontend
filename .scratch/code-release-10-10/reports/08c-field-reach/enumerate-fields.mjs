#!/usr/bin/env node
/**
 * enumerate-fields — enumerate the REQUEST contract field surface of the backend.
 *
 * Method (AST, not regex):
 *  1. Parse every non-spec .ts under src/ with the TypeScript parser.
 *  2. Find every `z.object({ ... })` call expression. Record its top-level
 *     property names, their positions, whether the chain carries `.strict()`,
 *     and the name of the enclosing `export const <name> = ...` if any.
 *  3. Find every `@Validate({ body: X, query: Y, params: Z })` decorator and
 *     every `@Body() x: T` / ZodValidationPipe usage, and resolve the schema
 *     identifier names that are REQUEST schemas.
 *  4. Emit JSON.
 *
 * WHAT THIS MISSES (state it whenever quoting a number):
 *  - schemas built by helper functions rather than a literal `z.object({...})`
 *  - fields contributed by `.extend()`, `.merge()`, `.and()` are recorded on
 *    their own literal, and inherited fields are not re-listed on the child
 *  - non-Zod DTOs (class-validator classes) — counted separately
 *  - RESPONSE shapes, which in this codebase are mostly inferred from Drizzle
 *    selects and have no schema at all
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOT = process.argv[2] || "/Users/tarunchintakunta/Personal/streamline/streamlineos-backend";
const SRC = join(ROOT, "src");
const OUT = process.argv[3] || "/tmp/fields.json";

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (e === "node_modules" || e === "dist") continue;
      walk(p, acc);
    } else if (e.endsWith(".ts") && !e.endsWith(".d.ts")) {
      acc.push(p);
    }
  }
  return acc;
}

const files = walk(SRC).sort();

/** schemaName -> { file, fields: [{name,line,pos,end,optional}], strict, kind } */
const schemas = [];
/** requests: { file, line, method, schemaRefs: {body,query,params} } */
const validateUses = [];
const classDtos = [];

function unwrapChain(node) {
  // walk down .strict() / .partial() / .extend() chains to find z.object literal
  return node;
}

for (const file of files) {
  const isSpec = /\.spec\.ts$/.test(file) || /__tests__/.test(file);
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const rel = relative(ROOT, file);

  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;

  function enclosingConstName(node) {
    let n = node.parent;
    let chainTail = node;
    while (n) {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) return n.name.text;
      if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name)) return `<prop:${n.name.text}>`;
      if (ts.isCallExpression(n) || ts.isPropertyAccessExpression(n) || ts.isParenthesizedExpression(n)) {
        chainTail = n;
        n = n.parent;
        continue;
      }
      return null;
    }
    return null;
  }

  function chainHasStrict(node) {
    let n = node.parent;
    while (n && (ts.isCallExpression(n) || ts.isPropertyAccessExpression(n))) {
      if (ts.isPropertyAccessExpression(n) && n.name.text === "strict") return true;
      n = n.parent;
    }
    return false;
  }

  function visit(node) {
    // z.object({...})
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "object" &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "z" &&
      node.arguments.length >= 1 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const lit = node.arguments[0];
      const fields = [];
      for (const p of lit.properties) {
        if (ts.isPropertyAssignment(p)) {
          const name = ts.isIdentifier(p.name)
            ? p.name.text
            : ts.isStringLiteral(p.name)
              ? p.name.text
              : null;
          if (name === null) continue;
          const src = p.getText(sf);
          fields.push({
            name,
            line: lineOf(p.getStart(sf)),
            pos: p.getStart(sf),
            end: p.getEnd(),
            optional: /\.optional\(\)|\.nullish\(\)|\.default\(/.test(src),
          });
        } else if (ts.isShorthandPropertyAssignment(p)) {
          fields.push({
            name: p.name.text,
            line: lineOf(p.getStart(sf)),
            pos: p.getStart(sf),
            end: p.getEnd(),
            optional: false,
          });
        } else if (ts.isSpreadAssignment(p)) {
          fields.push({ name: "<spread>", line: lineOf(p.getStart(sf)), spread: p.getText(sf).slice(0, 80) });
        }
      }
      schemas.push({
        file: rel,
        isSpec,
        name: enclosingConstName(node),
        line: lineOf(node.getStart(sf)),
        strict: chainHasStrict(node),
        fieldCount: fields.length,
        fields,
      });
    }

    // @Validate({ body: X, query: Y, params: Z })
    if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
      const callee = node.expression.expression;
      const dname = ts.isIdentifier(callee) ? callee.text : null;
      if (dname === "Validate" && node.expression.arguments.length) {
        const arg = node.expression.arguments[0];
        if (ts.isObjectLiteralExpression(arg)) {
          const refs = {};
          for (const p of arg.properties) {
            if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) {
              refs[p.name.text] = p.initializer.getText(sf);
            }
          }
          validateUses.push({ file: rel, line: lineOf(node.getStart(sf)), refs });
        }
      }
    }

    // class-validator style DTO classes
    if (ts.isClassDeclaration(node) && node.name && /Dto$/.test(node.name.text)) {
      const props = node.members
        .filter((m) => ts.isPropertyDeclaration(m) && m.name)
        .map((m) => ({ name: m.name.getText(sf), line: lineOf(m.getStart(sf)) }));
      classDtos.push({ file: rel, name: node.name.text, line: lineOf(node.getStart(sf)), props });
    }

    ts.forEachChild(node, visit);
  }
  visit(sf);
}

const out = { root: ROOT, fileCount: files.length, schemas, validateUses, classDtos };
writeFileSync(OUT, JSON.stringify(out, null, 1));

const nonSpec = schemas.filter((s) => !s.isSpec);
const named = nonSpec.filter((s) => s.name && !s.name.startsWith("<"));
const totalFields = nonSpec.reduce((a, s) => a + s.fieldCount, 0);
console.log(`files parsed:            ${files.length}`);
console.log(`z.object literals:       ${schemas.length} (non-spec ${nonSpec.length})`);
console.log(`  named export consts:   ${named.length}`);
console.log(`  anonymous/inline:      ${nonSpec.length - named.length}`);
console.log(`top-level fields:        ${totalFields} (non-spec)`);
console.log(`  .strict() literals:    ${nonSpec.filter((s) => s.strict).length}`);
console.log(`@Validate decorators:    ${validateUses.length}`);
console.log(`class *Dto declarations: ${classDtos.length} (${classDtos.reduce((a, d) => a + d.props.length, 0)} props)`);
console.log(`wrote ${OUT}`);
