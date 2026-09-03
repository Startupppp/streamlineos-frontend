import * as fs from "fs";
import * as path from "path";
import { PERMISSIONS } from "../roles";
import { MODULE_ACCESS_PERMISSIONS } from "../module-access";
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
       * The comparison set is the DECLARED backend names plus the FRONTEND's own
       * module-access list, which is what this suite has always compared. The
       * vendored artifact folds the generated `<module>:access:view|manage` keys
       * in for every delegable module, so they are subtracted here; substituting
       * them would silently widen this suite into a second, different assertion.
       * Four delegable modules are absent from ACCESS_MANAGED_MODULES and
       * feedbucket's two access keys are absent from the PermissionKey union —
       * both are real drift, reported rather than absorbed here.
       */
      const generated = new Set(
        delegableModuleIds().flatMap((moduleId) => [
          `${moduleId}:access:view`,
          `${moduleId}:access:manage`,
        ]),
      );
      backendNames = new Set([
        ...[...backendPermissionNames()].filter((name) => !generated.has(name)),
        ...MODULE_ACCESS_PERMISSIONS.map((permission) => permission.name),
      ]);
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
