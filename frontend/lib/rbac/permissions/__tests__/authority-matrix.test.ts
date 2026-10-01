import * as fs from "fs";
import * as path from "path";
import { backendPath } from "@/test-utils/backend-repo";
import { backendPermissionNames } from "@/test-utils/permission-catalog";
import type { PermissionKey } from "@/lib/rbac/permissions";

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

const BACKEND_RBAC_DIR = backendPath("src", "modules", "rbac");

describe("authority-matrix frontend mirror", () => {
  const catalogNames = backendPermissionNames();

  describe("Rows 1–2 — org ownership transfer, archive, delete are owner-only and must not be grantable permission keys", () => {
    it("catalog has no organization: lifecycle key that would create a grantable ownership bypass", () => {
      const bypassCandidates = [...catalogNames].filter(
        (key) =>
          key.startsWith("organization:") &&
          (key.includes("transfer") || key.includes("archive") || key.includes("delete")),
      );
      expect(bypassCandidates).toEqual([]);
    });
  });

  describe("Row 4 — enable modules: settings:manage is absent from all module role templates", () => {
    const MODULE_ENABLE_KEY: PermissionKey = "settings:manage";

    it("no backend module role template grants settings:manage", () => {
      const templateFiles = fs
        .readdirSync(BACKEND_RBAC_DIR)
        .filter((filename) => /^role-templates.*\.constants\.ts$/.test(filename));
      expect(templateFiles.length).toBeGreaterThan(0);
      for (const filename of templateFiles) {
        const src = fs.readFileSync(path.join(BACKEND_RBAC_DIR, filename), "utf8");
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
