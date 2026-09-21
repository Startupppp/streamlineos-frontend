import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const HR_ROUTES = path.resolve(__dirname);

function hrPageFiles(): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(HR_ROUTES, { recursive: true })) {
    const relative = String(entry).split(path.sep).join("/");
    if (relative === "page.tsx" || relative.endsWith("/page.tsx"))
      found.push(`app/(authenticated)/hr/${relative}`);
  }
  return found.sort();
}

function resolveAliasImport(specifier: string): string | null {
  if (!specifier.startsWith("@/")) return null;
  const base = path.join(ROOT, specifier.slice(2));
  for (const candidate of [`${base}.tsx`, `${base}.ts`, path.join(base, "index.ts"), path.join(base, "index.tsx")])
    if (existsSync(candidate)) return candidate;
  return null;
}

function importedModules(source: string): string[] {
  return [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
}

function resolveRelativeExport(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [`${base}.tsx`, `${base}.ts`])
    if (existsSync(candidate)) return candidate;
  return null;
}

function readsSearchParams(file: string): boolean {
  const source = readFileSync(file, "utf8");
  if (/\buseSearchParams\s*\(/.test(source)) return true;
  if (path.basename(file) !== "index.ts") return false;
  return [...source.matchAll(/export\s+[^;]*?from\s+["']([^"']+)["']/g)]
    .map((match) => resolveRelativeExport(file, match[1]))
    .some((target) => target !== null && /\buseSearchParams\s*\(/.test(readFileSync(target, "utf8")));
}

describe("HR routes wrap every useSearchParams consumer in a Suspense boundary", () => {
  const pages = hrPageFiles();

  it("scans a non-trivial route corpus, so an empty result means clean and not unscanned", () => {
    expect(pages.length).toBeGreaterThan(50);
  });

  it("finds the known consumers, so the resolver is proven to see through the @/ alias and feature barrels", () => {
    const consumers = pages.filter((page) =>
      importedModules(readFileSync(path.join(ROOT, page), "utf8"))
        .map(resolveAliasImport)
        .some((file) => file !== null && readsSearchParams(file)),
    );
    expect(consumers).toEqual(
      expect.arrayContaining([
        "app/(authenticated)/hr/performance/page.tsx",
        "app/(authenticated)/hr/employees/page.tsx",
        "app/(authenticated)/hr/org-chart/page.tsx",
        "app/(authenticated)/hr/access/page.tsx",
        "app/(authenticated)/hr/termination/page.tsx",
      ]),
    );
    expect(consumers.length).toBeGreaterThanOrEqual(14);
  });

  it("wraps each page whose directly imported feature component calls useSearchParams in <Suspense>, because a static prerender of that component bails to client rendering without one", () => {
    const unwrapped: string[] = [];
    for (const page of pages) {
      const source = readFileSync(path.join(ROOT, page), "utf8");
      const consumesSearchParams = importedModules(source)
        .map(resolveAliasImport)
        .some((file) => file !== null && readsSearchParams(file));
      if (consumesSearchParams && !/<Suspense\b/.test(source)) unwrapped.push(page);
    }
    expect(unwrapped).toEqual([]);
  });
});
