/**
 * @jest-environment node
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { partialMatchKey } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";

const FE_ROOT = join(__dirname, "..", "..");
const KEY_DIR = __dirname;
const SENTINEL = { __sentinel: true } as const;

interface FactoryShape {
  path: string;
  params: Array<{ name: string; optional: boolean }>;
  file: string;
  line: number;
}

function parseFactories(): Map<string, FactoryShape> {
  const found = new Map<string, FactoryShape>();
  for (const entry of readdirSync(KEY_DIR)) {
    if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) continue;
    const full = join(KEY_DIR, entry);
    const src = ts.createSourceFile(
      full,
      readFileSync(full, "utf8"),
      ts.ScriptTarget.ESNext,
      true,
    );
    const visitObject = (obj: ts.ObjectLiteralExpression, prefix: string): void => {
      for (const prop of obj.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const name = prop.name.getText(src).replace(/['"]/g, "");
        const path = prefix ? `${prefix}.${name}` : name;
        const init = prop.initializer;
        if (ts.isObjectLiteralExpression(init)) {
          visitObject(init, path);
          continue;
        }
        if (!ts.isArrowFunction(init)) continue;
        const { line } = src.getLineAndCharacterOfPosition(prop.getStart(src));
        found.set(path, {
          path,
          file: relative(FE_ROOT, full),
          line: line + 1,
          params: init.parameters.map((p) => ({
            name: p.name.getText(src),
            optional: !!p.questionToken || !!p.initializer,
          })),
        });
      }
    };
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        let init: ts.Expression = node.initializer;
        if (ts.isAsExpression(init)) init = init.expression;
        if (ts.isObjectLiteralExpression(init)) visitObject(init, "");
      }
      ts.forEachChild(node, visit);
    };
    visit(src);
  }
  return found;
}

function resolveFactory(path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, segment) =>
        node !== null && typeof node === "object"
          ? (node as Record<string, unknown>)[segment]
          : undefined,
      queryKeys,
    );
}

function isFactory(value: unknown): value is (...args: unknown[]) => readonly unknown[] {
  return typeof value === "function";
}

function placeholderArgs(count: number): unknown[] {
  return Array.from({ length: count }, (_, i) => (i % 2 === 0 ? `p${i}` : i + 1));
}

const factories = parseFactories();

describe("query key factories parse", () => {
  it("finds the registry's factories in lib/query-keys/*.ts", () => {
    expect(factories.size).toBeGreaterThan(200);
  });
});

describe("a shorter call is always an invalidation prefix of a longer one", () => {
  const optionalTail = [...factories.values()].filter(
    (f) => f.params.length > 0 && f.params[f.params.length - 1].optional,
  );

  it("covers every factory whose last parameter is optional", () => {
    expect(optionalTail.length).toBeGreaterThan(150);
  });

  it("omitting the trailing optional argument yields a prefix of supplying it", () => {
    const broken: string[] = [];
    for (const shape of optionalTail) {
      const fn = resolveFactory(shape.path);
      if (!isFactory(fn)) continue;
      const args = placeholderArgs(shape.params.length - 1);
      let short: readonly unknown[];
      let long: readonly unknown[];
      try {
        short = fn(...args);
        long = fn(...args, SENTINEL);
      } catch {
        broken.push(`${shape.path} threw when called (${shape.file}:${shape.line})`);
        continue;
      }
      if (!partialMatchKey(long as QueryKey, short as QueryKey)) {
        broken.push(
          `queryKeys.${shape.path} — ${shape.file}:${shape.line}\n` +
            `    short: ${JSON.stringify(short)}\n` +
            `    long:  ${JSON.stringify(long)}`,
        );
      }
    }
    expect(broken.join("\n")).toBe("");
  });

  it("omitting the trailing optional argument never leaves a literal undefined in the key", () => {
    const poisoned: string[] = [];
    for (const shape of optionalTail) {
      const fn = resolveFactory(shape.path);
      if (!isFactory(fn)) continue;
      let key: readonly unknown[];
      try {
        key = fn(...placeholderArgs(shape.params.length - 1));
      } catch {
        continue;
      }
      if (key.some((segment) => segment === undefined)) {
        poisoned.push(
          `queryKeys.${shape.path}() -> ${JSON.stringify(key)} (${shape.file}:${shape.line})`,
        );
      }
    }
    expect(poisoned.join("\n")).toBe("");
  });
});

describe("no call site in the app under-supplies a key factory", () => {
  const SKIP_DIRS = new Set([
    "node_modules",
    ".next",
    ".next-buildmart",
    ".git",
    "coverage",
    "public",
    "feedbucket-widget",
  ]);

  function* walk(dir: string): Generator<string> {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) yield* walk(full);
      else if (/\.tsx?$/.test(entry.name)) yield full;
    }
  }

  interface CallSite {
    path: string;
    given: number;
    file: string;
    line: number;
  }

  function collectUnderSuppliedCalls(): CallSite[] {
    const sites: CallSite[] = [];
    for (const file of walk(FE_ROOT)) {
      const text = readFileSync(file, "utf8");
      if (!text.includes("queryKeys.") && !text.includes("QueryKeys.")) continue;
      const src = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true);
      const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node)) {
          const callee = node.expression.getText(src);
          const match = /^(?:queryKeys|[A-Za-z][A-Za-z0-9]*QueryKeys)\.((?:[A-Za-z0-9_]+\.)*[A-Za-z0-9_]+)$/.exec(callee);
          const shape = match ? factories.get(match[1]) : undefined;
          const spread = node.arguments.some((a) => ts.isSpreadElement(a));
          if (shape && !spread && node.arguments.length < shape.params.length) {
            const { line } = src.getLineAndCharacterOfPosition(node.getStart(src));
            sites.push({
              path: shape.path,
              given: node.arguments.length,
              file: relative(FE_ROOT, file),
              line: line + 1,
            });
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(src);
    }
    return sites;
  }

  const sites = collectUnderSuppliedCalls();

  it("scans a meaningful number of partial factory calls", () => {
    expect(sites.length).toBeGreaterThan(50);
  });

  it("every partial call yields a key free of literal undefined segments", () => {
    const poisoned: string[] = [];
    for (const site of sites) {
      const fn = resolveFactory(site.path);
      if (!isFactory(fn)) continue;
      let key: readonly unknown[];
      try {
        key = fn(...placeholderArgs(site.given));
      } catch {
        continue;
      }
      if (key.some((segment) => segment === undefined)) {
        poisoned.push(
          `${site.file}:${site.line} — queryKeys.${site.path}(${site.given} arg(s)) -> ${JSON.stringify(key)}`,
        );
      }
    }
    expect(poisoned.join("\n")).toBe("");
  });

  it("every partial call is an invalidation prefix of the fully-supplied call", () => {
    const dead: string[] = [];
    for (const site of sites) {
      const shape = factories.get(site.path);
      const fn = resolveFactory(site.path);
      if (!shape || !isFactory(fn)) continue;
      let short: readonly unknown[];
      let long: readonly unknown[];
      try {
        short = fn(...placeholderArgs(site.given));
        long = fn(...placeholderArgs(shape.params.length));
      } catch {
        continue;
      }
      if (!partialMatchKey(long as QueryKey, short as QueryKey)) {
        dead.push(
          `${site.file}:${site.line} — queryKeys.${site.path} invalidation matches nothing\n` +
            `    called:   ${JSON.stringify(short)}\n` +
            `    read key: ${JSON.stringify(long)}`,
        );
      }
    }
    expect(dead.join("\n")).toBe("");
  });
});

describe("registry files stay parseable", () => {
  it("every non-test file in lib/query-keys is a file, not a nested directory", () => {
    for (const entry of readdirSync(KEY_DIR)) {
      expect(statSync(join(KEY_DIR, entry)).isFile()).toBe(true);
    }
  });
});
