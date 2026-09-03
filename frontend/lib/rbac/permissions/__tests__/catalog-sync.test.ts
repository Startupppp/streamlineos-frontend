import * as fs from "fs";
import * as path from "path";
import { PERMISSIONS } from "../roles";
import {
  ACCESS_MANAGED_MODULES,
  MODULE_ACCESS_PERMISSIONS,
} from "../module-access";
import {
  PERMISSION_CATALOG_PATH,
  backendPermissionNames,
  delegableModuleIds,
} from "@/test-utils/permission-catalog";

/**
 * The backend checkout sits at a different relative path on different machines,
 * and a hardcoded guess here was wrong twice in both directions; in CI, which
 * clones one repository, it was wrong every time and all five cross-repo
 * assertions returned before asserting anything. The catalogue is now vendored
 * as contracts/permission-catalog.json, so these checks run everywhere and
 * `check:permission-catalog` is what keeps the copy honest.
 */

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
      /**
       * The comparison set is the vendored backend catalogue verbatim, generated
       * `<module>:access:view|manage` keys included.
       *
       * It used to subtract those keys on both sides and substitute the
       * frontend's own `MODULE_ACCESS_PERMISSIONS` for them. That subtraction was
       * load-bearing: `ACCESS_MANAGED_MODULES` listed 10 of the backend's 14
       * delegable modules and `feedbucket:access:view|manage` were absent from
       * the `PermissionKey` union, and cancelling the generated keys out of both
       * sides is exactly what stopped the phantom, union-coverage and ghost
       * assertions below from seeing any of it. The list is now complete, so the
       * subtraction is gone and those three assertions cover the module-access
       * half of the catalogue for the first time.
       */
      backendNames = backendPermissionNames();
      backendAvailable = backendNames.size > 400;
    } catch {
      backendNames = new Set();
      backendAvailable = false;
    }
  });

  it("can reach the backend catalog — the cross-repo checks below assert nothing without it", () => {
    expect({ backendAvailable, artifact: PERMISSION_CATALOG_PATH }).toEqual({
      backendAvailable: true,
      artifact: PERMISSION_CATALOG_PATH,
    });
    expect(fs.existsSync(PERMISSION_CATALOG_PATH)).toBe(true);
  });

  /**
   * The module-access half of the catalogue is GENERATED from a list of module
   * ids rather than declared key by key, so a missing id silently removes two
   * real permissions instead of failing to compile. Asserting the list itself
   * against the vendored `delegableModuleIds()` is the only place that drift is
   * visible: it was 10 against the backend's 14 and every other assertion in
   * this file was arranged around it.
   */
  it("ACCESS_MANAGED_MODULES is exactly the backend's delegable modules", () => {
    if (!backendAvailable) return;
    expect([...ACCESS_MANAGED_MODULES].sort()).toEqual(
      [...delegableModuleIds()].sort(),
    );
  });

  it("generates both access keys for every delegable module", () => {
    if (!backendAvailable) return;
    const generated = new Set(
      MODULE_ACCESS_PERMISSIONS.map((permission) => permission.name),
    );
    const missing = delegableModuleIds()
      .flatMap((moduleId) => [
        `${moduleId}:access:view`,
        `${moduleId}:access:manage`,
      ])
      .filter((name) => !generated.has(name));
    expect(missing).toEqual([]);
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
   *
   * `*:access:*` keys used to be exempted here, which is why nothing noticed
   * that the union carried thirteen modules' access keys against the backend's
   * fourteen. They are ordinary catalogue entries in the vendored artifact, so
   * the exemption is gone and a `kb:access:view` — a key for a module with no
   * ladder — now fails instead of passing.
   */
  it("has no union-only ghosts — every PermissionKey exists in the backend catalog", () => {
    if (!backendAvailable) return;
    const ghosts = [...readPermissionKeyValues()]
      // The extractor matches every union literal in these files, including
      // non-key unions such as baselineScope's "own" | "all". A permission key
      // always contains a colon.
      .filter((name) => name.includes(":"))
      .filter((name) => !backendNames.has(name));
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
