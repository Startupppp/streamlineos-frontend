import * as fs from "fs";
import * as path from "path";
import { PERMISSIONS } from "../roles";
import { MODULE_ACCESS_PERMISSIONS } from "../module-access";
import { backendPath } from "@/lib/test-support/backend-path";

/**
 * `backend/` and `frontend/` are siblings inside one checkout, so this walks up
 * five levels — `__tests__` → `permissions` → `rbac` → `lib` → `frontend` — and
 * then down into the backend.
 *
 * It has been wrong twice, in both directions: once resolving to
 * `streamlineos-frontend/backend/...`, and once to a `streamlineos-backend`
 * sibling repository. Neither has ever existed here. Each time,
 * `backendAvailable` was false and all five cross-repo assertions returned
 * before asserting anything — including the ghost-key check this file exists to
 * provide. The first test below is the guard against a third time: it fails
 * loudly rather than letting the suite pass while proving nothing.
 */
/**
 * Resolved by looking, not by counting `..` segments.
 *
 * The comment above documents two wrong guesses; the hardcoded path was a third,
 * resolving to `streamlineos-frontend/backend/...` on the checkout this actually
 * runs in. Each time the five cross-repo assertions below returned before
 * asserting anything, and the suite stayed green while the drift guard it exists
 * to be was switched off.
 *
 * A list of candidates ends that argument: the layout may be `backend/` beside
 * `frontend/` in one checkout or `streamlineos-backend/` beside
 * `streamlineos-frontend/` in another, and this finds whichever is there. The
 * first test still fails loudly if none of them is, because a fourth layout is
 * likelier than this list being complete.
 */
const BACKEND_PERMS_DIR = backendPath("src/modules/rbac/permissions");

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
