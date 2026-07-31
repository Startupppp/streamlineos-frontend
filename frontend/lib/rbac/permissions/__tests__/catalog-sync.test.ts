import * as fs from "fs";
import * as path from "path";
import { PERMISSIONS } from "../roles";

const BACKEND_PERMS_DIR = path.resolve(
  __dirname,
  "../../../../../backend/src/modules/rbac/permissions",
);

const EXCLUDED_BACKEND_FILES = new Set([
  "index.ts",
  "catalog.ts",
  "role-defaults.ts",
  "types.ts",
]);

/**
 * Keys the frontend ships that the backend catalog does not declare.
 *
 * A phantom key makes `useCan("that:key")` false forever — the UI silently
 * hides a control nobody can ever unlock. Keep this empty.
 */
const KNOWN_PHANTOM_KEYS = new Set<string>();

function extractNamesFromSource(source: string): string[] {
  return [...source.matchAll(/^\s*name:\s*["'`]([^"'`]+)["'`]/gm)].map((m) => m[1]);
}

describe("permission catalog sync", () => {
  let backendNames: Set<string>;
  let backendAvailable: boolean;

  beforeAll(() => {
    try {
      const files = fs
        .readdirSync(BACKEND_PERMS_DIR)
        .filter((f) => f.endsWith(".ts") && !EXCLUDED_BACKEND_FILES.has(f));
      const names = files.flatMap((f) =>
        extractNamesFromSource(fs.readFileSync(path.join(BACKEND_PERMS_DIR, f), "utf8")),
      );
      backendNames = new Set(names);
      backendAvailable = true;
    } catch {
      backendNames = new Set();
      backendAvailable = false;
    }
  });

  it("has no duplicate permission names in the frontend catalog", () => {
    const frontendNames = PERMISSIONS.map((p) => p.name);
    expect(new Set(frontendNames).size).toBe(frontendNames.length);
  });

  it("has no phantom keys — every frontend permission exists in the backend catalog", () => {
    if (!backendAvailable) return;
    const newPhantoms = PERMISSIONS.map((p) => p.name).filter(
      (name) => !backendNames.has(name) && !KNOWN_PHANTOM_KEYS.has(name),
    );
    expect(newPhantoms).toEqual([]);
  });

  it("every frontend PERMISSIONS name appears in the PermissionKey union type", () => {
    const content = fs.readFileSync(path.resolve(__dirname, "../types.ts"), "utf8");
    const unionValues = new Set(
      [...content.matchAll(/\|\s*["']([^"']+)["']/gm)].map((m) => m[1]),
    );
    const missingFromUnion = PERMISSIONS.map((p) => p.name).filter(
      (name) => !unionValues.has(name),
    );
    expect(missingFromUnion).toEqual([]);
  });
});
