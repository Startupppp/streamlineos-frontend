/**
 * A `next/dynamic` boundary is one static import away from being undone: add
 * `import { Foo } from "./chart"` to a page and the chart library is back in
 * that route's first-load bundle, with nothing failing. Typecheck, lint and the
 * rest of the suite all stay green — the only signal is a slower page.
 *
 * This walks the real module graph from every route entry, following *static*
 * edges only, and asserts the heavy libraries below are never reachable that
 * way. Type-only imports are erased at compile time and CSS side-effect
 * imports are not JS, so both are excluded, exactly as the bundler treats them.
 */
import fs from "node:fs";
import path from "node:path";

const FE = path.resolve(__dirname, "..", "..");
const ROOTS = ["app", "features", "components", "hooks", "lib"];

/**
 * Libraries with no business in a route's first load. Each is behind a
 * `next/dynamic` boundary or an `await import()` inside an event handler.
 */
const MUST_STAY_LAZY = [
  "recharts",
  "@tiptap/react",
  "@tiptap/core",
  "@tiptap/starter-kit",
  "@tiptap/html",
  "react-easy-crop",
  "papaparse",
  "@xyflow/react",
  "platejs",
  "pdfjs-dist",
  "@excalidraw/excalidraw",
  "react-big-calendar",
] as const;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".next")) continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function resolveLocal(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(FE, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  const candidates = [
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.js`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

interface FileImports {
  local: string[];
  packages: string[];
}

function readStaticImports(file: string): FileImports {
  const src = fs.readFileSync(file, "utf8");
  const specs: string[] = [];

  const fromRe = /(?:^|\n)\s*(?:import|export)\s([^;]*?)from\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = fromRe.exec(src)) !== null) {
    if (/^\s*type\s/.test(match[1])) continue;
    specs.push(match[2]);
  }
  const sideEffectRe = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;
  while ((match = sideEffectRe.exec(src)) !== null) specs.push(match[1]);

  const local: string[] = [];
  const packages: string[] = [];
  for (const spec of specs) {
    if (/\.(css|scss|sass)$/.test(spec)) continue;
    const resolved = resolveLocal(spec, file);
    if (resolved) local.push(resolved);
    else if (!spec.startsWith(".") && !spec.startsWith("@/")) packages.push(spec);
  }
  return { local, packages };
}

function packageOf(spec: string): string {
  return spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
}

const allFiles = ROOTS.flatMap((root) => walk(path.join(FE, root)));
const graph = new Map<string, FileImports>();
for (const file of allFiles) graph.set(file, readStaticImports(file));

const routeEntries = allFiles.filter(
  (file) =>
    /[/\\]app[/\\].*[/\\](page|layout|template|default)\.tsx?$/.test(file) &&
    !/__tests__|\.test\./.test(file),
);

/** Every module a route can reach without crossing a `dynamic()`/`import()`. */
function eagerGraph(): Map<string, string> {
  const reachedFrom = new Map<string, string>();
  for (const entry of routeEntries) {
    const stack = [entry];
    while (stack.length > 0) {
      const file = stack.pop() as string;
      if (reachedFrom.has(file)) continue;
      reachedFrom.set(file, entry);
      for (const next of graph.get(file)?.local ?? []) stack.push(next);
    }
  }
  return reachedFrom;
}

describe("heavy libraries stay out of every route's first-load graph", () => {
  const reachedFrom = eagerGraph();

  it("found the route entries and the module graph to walk", () => {
    expect(routeEntries.length).toBeGreaterThan(100);
    expect(reachedFrom.size).toBeGreaterThan(500);
  });

  it.each(MUST_STAY_LAZY)("%s is only reachable through a dynamic boundary", (pkg) => {
    const offenders: string[] = [];
    for (const [file, entry] of reachedFrom) {
      if (/__tests__|\.test\./.test(file)) continue;
      const imports = graph.get(file);
      if (!imports) continue;
      if (imports.packages.some((spec) => packageOf(spec) === pkg)) {
        offenders.push(
          `${path.relative(FE, file)}  (eager from ${path.relative(FE, entry)})`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });
});
