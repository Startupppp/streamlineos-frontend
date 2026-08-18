import * as fs from "fs";
import * as path from "path";
import { PERMISSIONS } from "../roles";
import { MODULE_ACCESS_PERMISSIONS } from "../module-access";

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

function extractNamesFromSource(source: string): string[] {
  return [...source.matchAll(/^\s*name:\s*["'`]([^"'`]+)["'`]/gm)].map((m) => m[1]);
}

function readPermissionKeyValues(): Set<string> {
  const permissionDirectory = path.resolve(__dirname, "..");
  const permissionTypeFiles = fs
    .readdirSync(permissionDirectory)
    .filter(
      (fileName) =>
        fileName === "types.ts" || fileName.startsWith("permission-key-"),
    );
  const source = permissionTypeFiles
    .map((fileName) =>
      fs.readFileSync(path.join(permissionDirectory, fileName), "utf8"),
    )
    .join("\n");
  return new Set(
    [...source.matchAll(/\|\s*["']([^"']+)["']/gm)].map(
      (match) => match[1],
    ),
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
        extractNamesFromSource(fs.readFileSync(path.join(BACKEND_PERMS_DIR, f), "utf8")),
      );
      backendNames = new Set([
        ...names.filter((name) => !name.includes("${")),
        ...MODULE_ACCESS_PERMISSIONS.map((permission) => permission.name),
      ]);
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
    const newPhantoms = PERMISSIONS.map((p) => p.name).filter((name) => !backendNames.has(name));
    expect(newPhantoms).toEqual([]);
  });

  it("exposes every backend permission in the frontend PermissionKey type", () => {
    if (!backendAvailable) return;
    const unionValues = readPermissionKeyValues();
    expect([...backendNames].filter((name) => !unionValues.has(name))).toEqual([]);
  });

  it("every frontend PERMISSIONS name appears in the PermissionKey union type", () => {
    const unionValues = readPermissionKeyValues();
    const missingFromUnion = PERMISSIONS.map((p) => p.name).filter(
      (name) => !unionValues.has(name),
    );
    expect(missingFromUnion).toEqual([]);
  });
});
