import * as fs from "fs";
import * as path from "path";
import { PERMISSIONS } from "../roles";
import { MODULE_ACCESS_PERMISSIONS } from "../module-access";
import { BACKEND_ROOT } from "@/test-utils/backend-repo";

/**
 * The backend checkout sits at a different relative path on different machines,
 * and a hardcoded guess here has been wrong twice in both directions. Each time
 * `backendAvailable` was false and all five cross-repo assertions returned before
 * asserting anything. `backendPath` searches for the real root instead, and the
 * first test below fails loudly rather than letting the suite prove nothing.
 */
const BACKEND_PERMS_DIR = BACKEND_ROOT
  ? path.join(BACKEND_ROOT, "src", "modules", "rbac", "permissions")
  : "";

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

  it("can reach the backend catalog — the cross-repo checks below assert nothing without it", () => {
    expect({ backendAvailable, dir: BACKEND_PERMS_DIR }).toEqual({
      backendAvailable: true,
      dir: BACKEND_PERMS_DIR,
    });
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

  /**
   * The reverse of the phantom check above, and the direction that was unguarded:
   * a key in the union with no backing catalog entry type-checks everywhere and
   * makes `useCan` false forever, silently hiding the control it gates.
   * `*:access:*` keys are generated per managed module rather than declared.
   */
  it("has no union-only ghosts — every PermissionKey exists in the backend catalog", () => {
    if (!backendAvailable) return;
    const ghosts = [...readPermissionKeyValues()]
      // The extractor matches every union literal in these files, including
      // non-key unions such as baselineScope's "own" | "all". A permission key
      // always contains a colon.
      .filter((name) => name.includes(":"))
      .filter(
        (name) => !backendNames.has(name) && !/^[a-z0-9-]+:access:(view|manage)$/.test(name),
      );
    expect(ghosts).toEqual([]);
  });

  /**
   * The direction no test covered, and the one the 13 `party:*` keys fell
   * through: a key can exist on the backend and in the frontend union — so it
   * type-checks and `useCan` answers it — while being in no catalog file, which
   * is what the role editor renders. Nobody can grant what it cannot list.
   *
   * Scoped to the CRM namespaces rather than asserted platform-wide: several
   * older modules (`timesheets:*`, `surveys:*` among them) carry the same gap,
   * and closing those is their own work. This holds the line where it was just
   * repaired instead of pinning debt it is not fixing.
   */
  it("every CRM-namespace backend permission is grantable in the role editor", () => {
    if (!backendAvailable) return;
    const catalogNames = new Set(PERMISSIONS.map((p) => p.name));
    const ungrantable = [...backendNames]
      .filter((name) => name.startsWith("party:") || name.startsWith("crm:"))
      .filter((name) => !catalogNames.has(name));
    expect(ungrantable).toEqual([]);
  });

  it("every key parses into a module segment plus at least one more", () => {
    if (!backendAvailable) return;
    const unparseable = [...backendNames].filter((name) => {
      const parts = name.split(":");
      return parts.length < 2 || parts.some((segment) => segment.length === 0);
    });
    expect(unparseable).toEqual([]);
  });
});
