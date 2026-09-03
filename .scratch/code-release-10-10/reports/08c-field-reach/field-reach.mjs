#!/usr/bin/env node
/**
 * field-reach — whole-program PROPERTY reachability, resolved by the TypeScript
 * type checker, not by text search.
 *
 * THE CLAIM THIS EXISTS TO TEST. Ticket 08 box 4 recorded that "no instrument in
 * either repository resolves a FIELD" — that knip and `tsc --noUnusedLocals`
 * both stop at a file/export/type boundary. That is true of those two tools. It
 * is NOT true of the checker underneath them: `getSymbolAtLocation` on the
 * `name` of a property access whose object is `z.infer<typeof schema>` returns a
 * symbol whose `declarations` are the ORIGINAL `PropertyAssignment` inside the
 * `z.object({ ... })` literal, with file and line. Verified on a three-file
 * probe against the repository's own zod before this script was written.
 *
 * WHAT IT MARKS AS A READ (all resolved through the checker):
 *   access      x.field
 *   element     x["field"]
 *   destructure const { field } = x
 *   construct   an object literal contextually typed by the DTO that sets field
 *   spread      { ...x } where x's type carries the field (whole-object carry)
 *   assignable  x is passed/returned where the DTO type is expected — carried
 *               by the spread/construct rules at the destination
 *
 * WHAT IT MISSES — state this whenever quoting a number:
 *   - access through `any` or a cast that erases the DTO type
 *   - dynamic keys: x[k], Object.keys(x).forEach(k => x[k])
 *   - reads in the OTHER repository (frontend), which does not import these types
 *   - reads by a runtime consumer with no TypeScript at all (SQL, a template,
 *     a queue payload deserialised as `unknown`)
 *   - a field read only through JSON.stringify(x) / structuredClone(x)
 *   Consequence: "0 reads" from this tool is a CANDIDATE, never a verdict. Every
 *   removal in this ticket is decided by deleting the field and reading tsc.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

const ROOT = process.argv[2];
const TSCONFIG = process.argv[3];
const OUT = process.argv[4];

const cfgPath = join(ROOT, TSCONFIG);
const cfg = ts.parseJsonConfigFileContent(
  ts.readConfigFile(cfgPath, ts.sys.readFile).config,
  ts.sys,
  ROOT,
);
console.log(`program files: ${cfg.fileNames.length}`);
const program = ts.createProgram(cfg.fileNames, { ...cfg.options, skipLibCheck: true, noEmit: true });
const checker = program.getTypeChecker();

/** key `${file}:${pos}` -> { kinds:Set, count } */
const reached = new Map();
let accessCount = 0;

function key(decl) {
  return `${relative(ROOT, decl.getSourceFile().fileName)}:${decl.getStart()}`;
}

function mark(sym, kind, fromFile) {
  if (!sym) return;
  const decls = sym.declarations;
  if (!decls) return;
  for (const d of decls) {
    const f = d.getSourceFile();
    if (f.fileName.includes("node_modules")) continue;
    const k = key(d);
    let e = reached.get(k);
    if (!e) {
      e = { kinds: {}, from: new Set() };
      reached.set(k, e);
    }
    e.kinds[kind] = (e.kinds[kind] || 0) + 1;
    if (e.from.size < 6) e.from.add(fromFile);
  }
}

/** mark every property of a type (whole-object carry: spread / stringify) */
function markAllProps(type, kind, fromFile) {
  if (!type) return;
  let props;
  try {
    props = checker.getPropertiesOfType(type);
  } catch {
    return;
  }
  if (!props || props.length > 400) return;
  for (const p of props) mark(p, kind, fromFile);
}

const WHOLE_OBJECT_CALLS = new Set(["stringify", "assign", "entries", "keys", "values", "freeze", "structuredClone"]);

for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile) continue;
  if (sf.fileName.includes("node_modules")) continue;
  const rel = relative(ROOT, sf.fileName);

  const visit = (node) => {
    // x.field
    if (ts.isPropertyAccessExpression(node)) {
      accessCount++;
      mark(checker.getSymbolAtLocation(node.name), "access", rel);
    }
    // x["field"]
    else if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteralLike(node.argumentExpression)) {
      accessCount++;
      mark(checker.getSymbolAtLocation(node.argumentExpression), "element", rel);
    }
    // const { field } = x   /   ({ field }) => ...
    else if (ts.isBindingElement(node) && node.parent && ts.isObjectBindingPattern(node.parent)) {
      const nameNode = node.propertyName ?? node.name;
      if (ts.isIdentifier(nameNode) || ts.isStringLiteralLike(nameNode)) {
        accessCount++;
        // The binding element's own symbol is the LOCAL, not the property.
        // Resolve the property off the type the pattern is destructuring.
        const patternType = checker.getTypeAtLocation(node.parent);
        const prop = patternType && patternType.getProperty(nameNode.text);
        if (prop) mark(prop, "destructure", rel);
        else mark(checker.getSymbolAtLocation(nameNode), "destructure", rel);
      }
      if (node.dotDotDotToken) {
        // const { a, ...rest } = x  -> rest carries every remaining field
        markAllProps(checker.getTypeAtLocation(node.parent.parent), "restcarry", rel);
      }
    }
    // object literal contextually typed by the DTO -> constructing it is a use
    else if (ts.isObjectLiteralExpression(node)) {
      const ctx = checker.getContextualType(node);
      if (ctx) {
        for (const p of node.properties) {
          const n = p.name;
          if (!n) continue;
          const nm = ts.isIdentifier(n) || ts.isStringLiteralLike(n) ? n.text : null;
          if (nm === null) continue;
          const target = ctx.getProperty(nm);
          if (target) mark(target, "construct", rel);
        }
      }
      for (const p of node.properties) {
        if (ts.isSpreadAssignment(p)) {
          markAllProps(checker.getTypeAtLocation(p.expression), "spread", rel);
        }
      }
    }
    // JSON.stringify(x), Object.assign/keys/entries/values(x)
    else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && WHOLE_OBJECT_CALLS.has(node.expression.name.text)) {
      for (const a of node.arguments) markAllProps(checker.getTypeAtLocation(a), "wholeobject", rel);
    }

    // ---------------------------------------------------------------- MIRROR
    // The blind spot that made this measurement wrong on its first pass.
    // `entities.controller.ts` passes `body: CreateEntityInput` (the z.infer) to
    // `entities.service.create(orgId, userId, body)`, whose parameter is a
    // HAND-WRITTEN structural type `{ legalName: string; pan?: string; ... }`.
    // The service then reads `body.pan` — but that read resolves to the SERVICE's
    // own inline property declaration, not to the schema literal, so the schema
    // field records zero references. Deleting it does not even break the build,
    // because the mirrored property is OPTIONAL: the shortened object stays
    // assignable and `pan` silently becomes `undefined` on every request. Eight
    // payroll statutory identifiers (pan, tan, pfEstablishmentCode, esiCode …)
    // sat in the candidate list for exactly this reason.
    // So: when a value flows into a parameter of a DIFFERENT type, every field
    // the two types share by name is marked reached. Deliberately conservative —
    // it can only move a field OUT of the removal set.
    // MIRROR, second shape: an `as` cast at the seam.
    // `inbound-ingress.controller.ts` does
    //   this.ingress.accept(body as InboundCommunicationEvent)
    // which ERASES the schema type before the call, so the call-site mirror rule
    // below never sees the schema's properties. Every field of that webhook
    // payload — provider, providerMessageId, participants, body — then reads as
    // unreferenced. Handle the cast itself: name-match the operand's schema
    // properties against the asserted type.
    if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isTypeAssertionExpression(node)) {
      let src, dst;
      try {
        src = checker.getTypeAtLocation(node.expression);
        dst = checker.getTypeFromTypeNode(node.type);
      } catch { src = null; }
      if (src && dst && src !== dst) {
        let sp;
        try { sp = checker.getPropertiesOfType(src); } catch { sp = null; }
        if (sp && sp.length && sp.length <= 200) {
          for (const p of sp) {
            let t = null;
            try { t = dst.getProperty(p.getName()); } catch { /* union */ }
            if (t) mark(p, "cast", rel);
          }
        }
      }
    }

    // MIRROR, primary shape: a value flowing into a differently-typed parameter.
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const args = node.arguments;
      if (args && args.length) {
        let sig;
        try { sig = checker.getResolvedSignature(node); } catch { sig = null; }
        if (sig) {
          const params = sig.getParameters();
          for (let i = 0; i < args.length; i++) {
            const p = params[Math.min(i, params.length - 1)];
            if (!p) continue;
            let argType, paramType;
            try {
              argType = checker.getTypeAtLocation(args[i]);
              paramType = checker.getTypeOfSymbolAtLocation(p, node);
            } catch { continue; }
            if (!argType || !paramType || argType === paramType) continue;
            let argProps;
            try { argProps = checker.getPropertiesOfType(argType); } catch { continue; }
            if (!argProps || !argProps.length || argProps.length > 200) continue;
            for (const ap of argProps) {
              let target = null;
              try { target = paramType.getProperty(ap.getName()); } catch { /* union */ }
              if (target) mark(ap, "mirror", rel);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

const outObj = {};
for (const [k, v] of reached) outObj[k] = { kinds: v.kinds, from: [...v.from] };
writeFileSync(OUT, JSON.stringify(outObj));
console.log(`property references resolved: ${accessCount}`);
console.log(`distinct declaration sites reached: ${reached.size}`);
console.log(`wrote ${OUT}`);
