import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

export const SEAM_METHODS = { get: 3, post: 3, put: 3, patch: 3, delete: 3, upload: 2 };
export const SEAM_FUNCTIONS = { serverGet: 1, publicGet: 2, publicGetNoStore: 2, fetchChannelPage: 2 };

const SEAM_FUNCTION_VERBS = {
  serverGet: "get",
  publicGet: "get",
  publicGetNoStore: "get",
  fetchChannelPage: "get",
  upload: "post",
};

const LAZY_IMPORT_RE =
  /import\(\s*["'`]([^"'`]+)["'`]\s*\)\s*\.then\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*\)?\s*=>\s*\2\s*\.\s*([A-Za-z_$][\w$]*)/;

const TEST_FILE_RE = /\.(test|spec)\.tsx?$/;

export function sourceFiles(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (TEST_FILE_RE.test(entry)) continue;
    out.push(full);
  }
  return out;
}

export function routeOf(node) {
  if (node === undefined) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text.split("?")[0] ?? null;
  if (ts.isTemplateExpression(node)) {
    let text = node.head.text;
    for (const span of node.templateSpans) text += `*${span.literal.text}`;
    return text.split("?")[0] ?? null;
  }
  return null;
}

function seamOf(node, source) {
  if (
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.expression.getText(source) === "apiClient"
  ) {
    const method = node.expression.name.getText(source);
    const index = SEAM_METHODS[method];
    return index === undefined ? null : { method, index };
  }
  if (ts.isIdentifier(node.expression)) {
    const method = node.expression.getText(source);
    const index = SEAM_FUNCTIONS[method];
    return index === undefined ? null : { method, index };
  }
  return null;
}

function lazyRefFromText(text) {
  const match = LAZY_IMPORT_RE.exec(text);
  if (match === null) return null;
  return { specifier: match[1], exportName: match[3] };
}

function collectBindings(source, fileText) {
  const imports = new Map();
  const locals = new Map();
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const clause = node.importClause;
      if (clause !== undefined && clause.isTypeOnly !== true) {
        if (clause.name !== undefined) imports.set(clause.name.text, { specifier, exportName: "default" });
        const bindings = clause.namedBindings;
        if (bindings !== undefined && ts.isNamedImports(bindings))
          for (const element of bindings.elements)
            imports.set(element.name.text, {
              specifier,
              exportName: element.propertyName?.text ?? element.name.text,
            });
      }
    }
    if (ts.isVariableStatement(node)) {
      const exported = node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
      for (const declaration of node.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) continue;
        const name = declaration.name.text;
        const lazy = lazyRefFromText(declaration.initializer.getText(source));
        if (lazy !== null) {
          locals.set(name, lazy);
          continue;
        }
        if (exported) locals.set(name, { specifier: null, exportName: name, ownFile: true });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  void fileText;
  return { imports, locals };
}

function contractRefOf(node, bindings, source) {
  if (node === undefined) return { ref: null, reason: "no contract argument" };
  if (ts.isIdentifier(node)) {
    if (node.text === "undefined") return { ref: null, reason: "no contract argument" };
    const local = bindings.locals.get(node.text);
    if (local !== undefined) return { ref: { ...local, identifier: node.text } };
    const imported = bindings.imports.get(node.text);
    if (imported !== undefined) return { ref: { ...imported, identifier: node.text } };
    return { ref: null, reason: `contract identifier '${node.text}' is not an import or a module-level const` };
  }
  if (ts.isPropertyAccessExpression(node) || ts.isCallExpression(node) || ts.isArrowFunction(node)) {
    const lazy = lazyRefFromText(node.getText(source));
    if (lazy !== null) return { ref: { ...lazy, identifier: node.getText(source).slice(0, 40) } };
    return { ref: null, reason: "contract expression is not a resolvable module export" };
  }
  return { ref: null, reason: "contract expression is not a resolvable module export" };
}

export function scanSource(fileName, text, label = fileName) {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.ESNext,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const bindings = collectBindings(source, text);
  const calls = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const seam = seamOf(node, source);
      if (seam !== null) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        const contract = contractRefOf(node.arguments[seam.index], bindings, source);
        calls.push({
          file: label,
          absolute: fileName,
          line: line + 1,
          seam: seam.method,
          method: SEAM_FUNCTION_VERBS[seam.method] ?? seam.method,
          route: routeOf(node.arguments[0]),
          ref: contract.ref,
          reason: contract.reason ?? null,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return calls;
}

export function scanTree(root, directories) {
  const calls = [];
  for (const directory of directories)
    for (const file of sourceFiles(join(root, directory)))
      calls.push(...scanSource(file, readFileSync(file, "utf8"), file.replace(root, "").replaceAll("\\", "/").replace(/^\//, "")));
  return calls;
}

const LAZY_EXPORT_RE = /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*lazyContract\(([\s\S]{0,600}?)\)\s*;/g;
const lazyExportCache = new Map();

export function lazyExportsOf(file) {
  const cached = lazyExportCache.get(file);
  if (cached !== undefined) return cached;
  const exports = new Map();
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    lazyExportCache.set(file, exports);
    return exports;
  }
  for (const match of text.matchAll(LAZY_EXPORT_RE)) {
    const lazy = lazyRefFromText(match[2]);
    if (lazy !== null) exports.set(match[1], lazy);
  }
  lazyExportCache.set(file, exports);
  return exports;
}

export function followLazyExport(file, exportName, root) {
  let current = { file, exportName };
  for (let hop = 0; hop < 3; hop += 1) {
    const lazy = lazyExportsOf(current.file).get(current.exportName);
    if (lazy === undefined) return current;
    const next = resolveModuleFile(lazy.specifier, current.file, root);
    if (next === null) return current;
    current = { file: next, exportName: lazy.exportName };
  }
  return current;
}

export function resolveModuleFile(specifier, fromFile, root) {
  let base;
  if (specifier.startsWith("@/")) base = join(root, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")])
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return null;
}

export function fieldLine(file, field) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const lines = text.split(/\r?\n/);
  const pattern = new RegExp(`(^|[\\s{(,])${field}\\s*:`);
  const matches = [];
  for (let index = 0; index < lines.length; index += 1) if (pattern.test(lines[index])) matches.push(index + 1);
  if (matches.length === 0) return null;
  return { line: matches[0], occurrences: matches.length };
}
