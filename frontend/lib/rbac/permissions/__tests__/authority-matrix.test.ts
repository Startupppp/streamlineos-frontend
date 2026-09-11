import { backendPath } from "@/lib/test-support/backend-path";
import * as fs from "fs";
import * as path from "path";
import { PERMISSIONS } from "../roles";

/**
 * Authority-matrix frontend mirror — PRD §12.
 *
 * The backend authority-matrix.spec.ts tests runtime enforcement; this test
 * verifies the frontend catalog so drift cannot silently break useCan() gates
 * or introduce a bypass key that should not be grantable.
 *
 * Row layout:
 *  Row 1  Transfer org ownership  — org owner only, enforced via isOrgOwner, NOT a permission key
 *  Row 2  Archive / delete org    — org owner only, same structural check, NOT a permission key
 *  Row 3  Manage org membership   — org owner + org admin (structural), gated on settings:organization:manage
 *  Row 4  Enable modules          — org owner + org admin, gated on settings:manage
 *
 * These keys must live in both catalogs. Rows 1–2 must have no grantable
 * permission key — expressing ownership transfer as a key creates a second
 * superuser path (CLAUDE.md §21).
 */

const BACKEND_PERMS_DIR = backendPath("src/modules/rbac/permissions");
const BACKEND_RBAC_DIR = backendPath("src/modules/rbac");

const EXCLUDED_BACKEND_FILES = new Set(["index.ts", "catalog.ts", "role-defaults.ts", "types.ts"]);

function readBackendPermissionNames(): Set<string> {
  const files = fs
    .readdirSync(BACKEND_PERMS_DIR)
    .filter((f) => f.endsWith(".ts") && !EXCLUDED_BACKEND_FILES.has(f));
  const names: string[] = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(BACKEND_PERMS_DIR, f), "utf8");
    for (const m of src.matchAll(/^\s*name:\s*["'`]([^"'`]+)["'`]/gm)) {
      names.push(m[1]);
    }
  }
  return new Set(names.filter((n) => !n.includes("${")));
}

describe("authority-matrix frontend mirror", () => {
  let backendAvailable: boolean;
  let backendNames: Set<string>;

  beforeAll(() => {
    try {
      fs.accessSync(BACKEND_PERMS_DIR);
      backendNames = readBackendPermissionNames();
      backendAvailable = true;
    } catch {
      backendNames = new Set();
      backendAvailable = false;
    }
  });

  it("can reach the backend catalog — cross-repo assertions below prove nothing without it", () => {
    expect({ backendAvailable, dir: BACKEND_PERMS_DIR }).toEqual({
      backendAvailable: true,
      dir: BACKEND_PERMS_DIR,
    });
  });

  describe("Rows 1–2 — org ownership transfer, archive, delete are owner-only and must not be grantable permission keys", () => {
    it("frontend catalog has no organization: lifecycle key that would create a grantable ownership bypass", () => {
      const bypassCandidates = PERMISSIONS.map((p) => p.name).filter(
        (key) =>
          key.startsWith("organization:") &&
          (key.includes("transfer") || key.includes("archive") || key.includes("delete")),
      );
      expect(bypassCandidates).toEqual([]);
    });

    it("backend catalog has no organization: lifecycle key that would create a grantable ownership bypass", () => {
      if (!backendAvailable) return;
      const bypassCandidates = [...backendNames].filter(
        (key) =>
          key.startsWith("organization:") &&
          (key.includes("transfer") || key.includes("archive") || key.includes("delete")),
      );
      expect(bypassCandidates).toEqual([]);
    });
  });

  describe("Row 3 — manage org membership: settings:organization:manage exists in both catalogs", () => {
    const MEMBERSHIP_KEY = "settings:organization:manage";

    it("frontend PERMISSIONS catalog includes settings:organization:manage", () => {
      expect(PERMISSIONS.map((p) => p.name)).toContain(MEMBERSHIP_KEY);
    });

    it("backend catalog includes settings:organization:manage", () => {
      if (!backendAvailable) return;
      expect([...backendNames]).toContain(MEMBERSHIP_KEY);
    });
  });

  describe("Row 4 — enable modules: settings:manage exists in both catalogs and is absent from all module role templates", () => {
    const MODULE_ENABLE_KEY = "settings:manage";
    const TEMPLATE_FILES = [
      "role-templates.constants.ts",
      "role-templates-crm-hr.constants.ts",
      "role-templates-build.constants.ts",
    ];

    it("frontend PERMISSIONS catalog includes settings:manage", () => {
      expect(PERMISSIONS.map((p) => p.name)).toContain(MODULE_ENABLE_KEY);
    });

    it("backend catalog includes settings:manage", () => {
      if (!backendAvailable) return;
      expect([...backendNames]).toContain(MODULE_ENABLE_KEY);
    });

    it("no backend module role template grants settings:manage", () => {
      if (!backendAvailable) return;
      for (const filename of TEMPLATE_FILES) {
        const fullPath = path.join(BACKEND_RBAC_DIR, filename);
        if (!fs.existsSync(fullPath)) continue;
        const src = fs.readFileSync(fullPath, "utf8");
        const found =
          src.includes(`"${MODULE_ENABLE_KEY}"`) || src.includes(`'${MODULE_ENABLE_KEY}'`);
        expect({ file: filename, grantsSettingsManage: found }).toEqual({
          file: filename,
          grantsSettingsManage: false,
        });
      }
    });
  });
});
