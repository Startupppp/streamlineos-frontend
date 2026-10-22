import * as fs from "fs";
import * as path from "path";

const FE_ROOT = path.join(__dirname, "..", "..");
const PREFETCH_DIR = path.join(FE_ROOT, "lib", "prefetch");
const CLIENT_ROOTS = ["hooks", "features", "components", "app", "lib"];
const SOURCE_FILE = /\.(ts|tsx)$/;
const TEST_FILE = /\.(test|spec)\.(ts|tsx)$/;
const SPREAD = /\.\.\.(\w+)(?=\s*[(,\n}])/g;

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sourceFiles(full);
    return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name) ? [full] : [];
  });
}

function spreadNames(files: string[]): Set<string> {
  const names = new Set<string>();
  for (const file of files) {
    for (const match of fs.readFileSync(file, "utf8").matchAll(SPREAD)) {
      if (/(QueryOptions|Query)$/.test(match[1])) names.add(match[1]);
    }
  }
  return names;
}

const prefetchFiles = sourceFiles(PREFETCH_DIR);
const clientFiles = CLIENT_ROOTS.flatMap((root) => sourceFiles(path.join(FE_ROOT, root))).filter(
  (file) => !file.startsWith(PREFETCH_DIR + path.sep),
);

describe("prefetch query options are shared with a client hook", () => {
  it("finds prefetch factory spreads to check", () => {
    expect(spreadNames(prefetchFiles).size).toBeGreaterThan(20);
  });

  it("every factory a prefetch spreads is also used by client code", () => {
    const clientSource = clientFiles
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n")
      .replace(/export (const|function) \w+/g, "");
    const prefetchOnly = [...spreadNames(prefetchFiles)]
      .filter((name) => !new RegExp(`\\b${name}\\b`).test(clientSource))
      .sort();
    expect(prefetchOnly).toEqual([]);
  });

  it("no prefetch reaches a \"use client\" module, whose exports cannot be called on the server", () => {
    const VALUE_IMPORT = /import\s+(?!type\s)(?:[\w*{},\s]+?\s+from\s+)?["']((?:@\/|\.{1,2}\/)[^"']+)["']/g;
    const resolve = (from: string, spec: string): string | undefined => {
      const base = spec.startsWith("@/") ? path.join(FE_ROOT, spec.slice(2)) : path.resolve(path.dirname(from), spec);
      return [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find((candidate) => fs.existsSync(candidate));
    };
    const offenders: string[] = [];
    const seen = new Set<string>();
    const visit = (file: string, chain: string[]) => {
      if (seen.has(file)) return;
      seen.add(file);
      const source = fs.readFileSync(file, "utf8");
      if (/^\s*["']use client["']/.test(source)) {
        offenders.push(chain.map((step) => path.relative(FE_ROOT, step).split(path.sep).join("/")).join(" -> "));
        return;
      }
      for (const match of source.matchAll(VALUE_IMPORT)) {
        const target = resolve(file, match[1]);
        if (target) visit(target, [...chain, target]);
      }
    };
    for (const file of prefetchFiles) visit(file, [file]);
    expect(offenders.sort()).toEqual([]);
  });
});
