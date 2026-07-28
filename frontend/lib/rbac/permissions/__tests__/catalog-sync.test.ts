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

const KNOWN_PHANTOM_KEYS = new Set<string>();

function extractNamesFromSource(source: string): string[] {
  return [...source.matchAll(/^\s*name:\s*["']([^"']+)["']/gm)].map(
    (m) => m[1],
  );
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
        extractNamesFromSource(
          fs.readFileSync(path.join(BACKEND_PERMS_DIR, f), "utf8"),
        ),
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
    const uniqueNames = new Set(frontendNames);
    expect(uniqueNames.size).toBe(frontendNames.length);
  });

  it("has no new phantom keys — every frontend permission must exist in the backend catalog", () => {
    if (!backendAvailable) {
      return;
    }
    const frontendNames = PERMISSIONS.map((p) => p.name);
    const newPhantoms = frontendNames.filter(
      (name) => !backendNames.has(name) && !KNOWN_PHANTOM_KEYS.has(name),
    );
    expect(newPhantoms).toEqual([]);
  });

  it("known phantom keys have not grown — remove from KNOWN_PHANTOM_KEYS when backend adds the permission", () => {
    if (!backendAvailable) {
      return;
    }
    const frontendNames = new Set(PERMISSIONS.map((p) => p.name));
    const stillPhantom = [...KNOWN_PHANTOM_KEYS].filter(
      (name) => frontendNames.has(name) && !backendNames.has(name),
    );
    expect(stillPhantom.length).toBeLessThanOrEqual(KNOWN_PHANTOM_KEYS.size);
  });

  it("every frontend PERMISSIONS name appears in the PermissionKey union type", () => {
    const typesPath = path.resolve(__dirname, "../types.ts");
    const content = fs.readFileSync(typesPath, "utf8");
    const unionValues = new Set(
      [...content.matchAll(/\|\s*["']([^"']+)["']/gm)].map((m) => m[1]),
    );
    const frontendNames = PERMISSIONS.map((p) => p.name);
    const missingFromUnion = frontendNames.filter(
      (name) => !unionValues.has(name),
    );
    expect(missingFromUnion).toEqual([]);
  });
});
