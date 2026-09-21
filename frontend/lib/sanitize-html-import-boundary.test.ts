import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

const SOURCE_DIRECTORIES = ["app", "components", "features", "hooks", "lib"] as const;
const SOURCE_EXTENSIONS = [".ts", ".tsx"] as const;

const SANITISER_MODULE = "lib/sanitize-html.ts";

function sourceFiles(): string[] {
  const found: string[] = [];
  for (const directory of SOURCE_DIRECTORIES)
    for (const entry of readdirSync(path.join(ROOT, directory), { recursive: true })) {
      const relative = path.join(directory, String(entry)).split(path.sep).join("/");
      if (!SOURCE_EXTENSIONS.some((extension) => relative.endsWith(extension))) continue;
      if (relative.includes(".test.") || relative.includes("__tests__")) continue;
      found.push(relative);
    }
  return found;
}

function read(file: string): string {
  return readFileSync(path.join(ROOT, file), "utf8");
}

const STATIC_VALUE_IMPORT_OF_SANITISER =
  /^import\s+(?!type\s)[^;]*?from\s+["']@\/lib\/sanitize-html["']/m;

describe("the HTML sanitiser stays out of the server render graph", () => {
  const files = sourceFiles();

  it("scans a non-trivial corpus, so an empty result means clean and not unscanned", () => {
    expect(files.length).toBeGreaterThan(500);
    expect(files).toContain(SANITISER_MODULE);
  });

  it("imports isomorphic-dompurify from exactly one module, because its node build constructs a jsdom window at import and a bundled jsdom throws ENOENT during SSR (React #419)", () => {
    const importers = files.filter((file) => read(file).includes("isomorphic-dompurify"));
    expect(importers).toEqual([SANITISER_MODULE]);
  });

  it("never statically imports the sanitiser module from a component or hook, so a server-rendered client component cannot evaluate it", () => {
    const offenders = files.filter(
      (file) => file !== SANITISER_MODULE && STATIC_VALUE_IMPORT_OF_SANITISER.test(read(file)),
    );
    expect(offenders).toEqual([]);
  });
});
