#!/usr/bin/env node
/**
 * body-binding — for every route that validates with a Zod schema, is the
 * handler's `@Body()` / `@Query()` parameter TYPE actually derived from that
 * schema?
 *
 * WHY THIS DECIDES WHETHER ANY INSTRUMENT CAN SEE A FIELD. `@Validate({ body:
 * resendVerificationSchema })` next to `@Body() body: { email: string }` means
 * the runtime contract (zod, `.strict()`) and the compile-time contract (the
 * hand-written parameter type) are two SEPARATE declarations of the same shape.
 * Nothing links them. `body.email` then resolves to the inline literal type, so
 *   - the checker's reachability map records ZERO reads of the schema field, and
 *   - deleting the schema field does not break the build.
 * Both instruments report "dead" for a field the handler reads on every request.
 * A field on an unbound route can therefore never be removed on tool evidence,
 * and that is a property of the route's declaration style, not of the field.
 *
 * A route is BOUND when at least one property of the parameter's type declares
 * into the validating schema's own `z.object({...})` literal — checked through
 * the type checker, so `z.infer<typeof s>`, `type X = z.infer<typeof s>` and
 * `Pick<X, ...>` all count and a same-shaped hand-written type does not.
 */
import { writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOT = "/Users/tarunchintakunta/Personal/streamline/streamlineos-backend";
const S = "/private/tmp/claude-501/-Users-tarunchintakunta-Personal-streamline/20eca33e-bd07-41a6-ac7b-f606f1ada0e1/scratchpad/t08";

const cfg = ts.parseJsonConfigFileContent(
  ts.readConfigFile(join(ROOT, "tsconfig.build.json"), ts.sys.readFile).config,
  ts.sys,
  ROOT,
);
const program = ts.createProgram(cfg.fileNames, { ...cfg.options, skipLibCheck: true, noEmit: true });
const checker = program.getTypeChecker();

const rows = [];
const SLOT_DECORATOR = { body: "Body", query: "Query", params: "Param" };

for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile || sf.fileName.includes("node_modules")) continue;
  if (!/\.controller\.ts$/.test(sf.fileName)) continue;
  const rel = relative(ROOT, sf.fileName);

  const visit = (node) => {
    if (ts.isMethodDeclaration(node)) {
      const decs = ts.getDecorators(node) || [];
      let validate = null;
      for (const d of decs) {
        if (!ts.isCallExpression(d.expression)) continue;
        const c = d.expression.expression;
        if (ts.isIdentifier(c) && c.text === "Validate" && d.expression.arguments.length) {
          const a = d.expression.arguments[0];
          if (ts.isObjectLiteralExpression(a)) {
            validate = {};
            for (const p of a.properties)
              if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name))
                validate[p.name.text] = p.initializer;
          }
        }
      }
      if (validate) {
        for (const slot of ["body", "query"]) {
          const schemaExpr = validate[slot];
          if (!schemaExpr) continue;
          // the z.object literal(s) that back this schema expression
          const schemaType = checker.getTypeAtLocation(schemaExpr);
          const outSym = schemaType && schemaType.getProperty("_output");
          const outType = outSym ? checker.getTypeOfSymbolAtLocation(outSym, schemaExpr) : null;
          const schemaDeclKeys = new Set();
          if (outType) {
            for (const p of checker.getPropertiesOfType(outType))
              for (const d of p.declarations || [])
                schemaDeclKeys.add(`${d.getSourceFile().fileName}:${d.getStart()}`);
          }
          // the handler parameter decorated for this slot
          const decName = SLOT_DECORATOR[slot];
          let param = null;
          for (const pr of node.parameters) {
            for (const d of ts.getDecorators(pr) || []) {
              if (!ts.isCallExpression(d.expression)) continue;
              const c = d.expression.expression;
              if (ts.isIdentifier(c) && c.text === decName && d.expression.arguments.length === 0) param = pr;
            }
          }
          let verdict = "no-param";
          let paramType = null;
          if (param) {
            const pt = checker.getTypeAtLocation(param);
            paramType = checker.typeToString(pt).slice(0, 120);
            let hit = 0;
            for (const p of checker.getPropertiesOfType(pt))
              for (const d of p.declarations || [])
                if (schemaDeclKeys.has(`${d.getSourceFile().fileName}:${d.getStart()}`)) hit++;
            verdict = hit > 0 ? "BOUND" : "UNBOUND";
          }
          rows.push({
            file: rel,
            line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
            method: node.name.getText(sf),
            slot,
            schema: schemaExpr.getText(sf).slice(0, 60),
            schemaFieldCount: schemaDeclKeys.size,
            verdict,
            paramType,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

writeFileSync(`${S}/body-binding.json`, JSON.stringify(rows, null, 1));
const t = {};
for (const r of rows) t[`${r.slot}:${r.verdict}`] = (t[`${r.slot}:${r.verdict}`] || 0) + 1;
console.log(`validated body/query slots on controller routes: ${rows.length}`);
Object.entries(t).sort().forEach(([k, v]) => console.log(`  ${k.padEnd(16)} ${v}`));
