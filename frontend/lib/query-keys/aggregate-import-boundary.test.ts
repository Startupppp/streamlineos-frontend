/**
 * @jest-environment node
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const frontendRoot = join(__dirname, "..", "..");
const skippedDirectories = new Set([
  ".git",
  ".next",
  "coverage",
  "node_modules",
]);
const excludedProductPaths = [
  "/app/(authenticated)/crm/",
  "/app/(authenticated)/inventory/",
  "/app/(public)/crm/",
  "/app/(public)/inventory/",
  "/features/crm/",
  "/features/inventory/",
  "/hooks/api/crm",
  "/hooks/api/inventory",
];
const aggregateImport = /from\s+["'](?:@\/lib\/query-keys|\.\.?\/query-keys)["']/;

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    if (skippedDirectories.has(entry)) return [];
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    if (!/\.(?:ts|tsx)$/.test(entry)) return [];
    if (/(?:\.test|\.spec)\.(?:ts|tsx)$/.test(entry)) return [];
    return [path];
  });
}

it("keeps the aggregate query-key registry out of in-scope production modules", () => {
  const violations = listSourceFiles(frontendRoot).flatMap((path) => {
    const relativePath = `/${relative(frontendRoot, path).split(sep).join("/")}`;
    if (relativePath === "/lib/query-keys.ts") return [];
    if (excludedProductPaths.some((prefix) => relativePath.includes(prefix)))
      return [];
    return aggregateImport.test(readFileSync(path, "utf8"))
      ? [relativePath]
      : [];
  });

  expect(violations).toEqual([]);
});
